import { AxiosError, type AxiosAdapter } from 'axios'
import { describe, expect, it } from 'vitest'
import { ApiError, getApiErrorMessage, http, isApiError } from './http'

/** Adapter that always fails with the given response body and status. */
const failingAdapter =
  (data: unknown, status: number): AxiosAdapter =>
  async (config) => {
    throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
      data,
      status,
      statusText: 'Error',
      headers: {},
      config,
    })
  }

/** Adapter that simulates a network-level failure (no response). */
const networkAdapter: AxiosAdapter = async (config) => {
  const err = new AxiosError('Network Error', 'ERR_NETWORK', config, null, undefined)
  throw err
}

/** Adapter that simulates a request timeout. */
const timeoutAdapter: AxiosAdapter = async (config) => {
  const err = new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED', config, null, undefined)
  throw err
}

describe('http error normalization', () => {
  it('keeps the ApiError when a validation errors array contains null', async () => {
    const adapter = failingAdapter(
      {
        code: 'VALIDATION_FAILED',
        errors: [{ path: ['email'], message: 'Enter a valid email.' }, null],
      },
      422,
    )

    try {
      await http.post('/register', {}, { adapter })
      expect.fail('request should reject')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      expect(error).toMatchObject({
        status: 422,
        code: 'VALIDATION_FAILED',
        fieldErrors: { email: 'Enter a valid email.' },
        message: 'Check the highlighted fields and try again.',
      })
    }
  })

  it("uses the server's own message when no curated copy exists", async () => {
    const adapter = failingAdapter(
      { code: 'BILLING_CARD_DECLINED', message: 'Your card was declined.' },
      402,
    )

    try {
      await http.post('/payments', {}, { adapter })
      expect.fail('request should reject')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      expect(error).toMatchObject({
        status: 402,
        code: 'BILLING_CARD_DECLINED',
        message: 'Your card was declined.',
      })
    }
  })

  it('falls back to the explicit HTTP_ERROR copy when the body has no message', async () => {
    const adapter = failingAdapter({}, 400)

    try {
      await http.post('/things', {}, { adapter })
      expect.fail('request should reject')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      expect(error).toMatchObject({
        status: 400,
        code: 'HTTP_ERROR',
        message: 'The request could not be completed.',
      })
    }
  })

  it("uses the server's message when the body carries no code", async () => {
    const adapter = failingAdapter({ message: 'Slow down a little.' }, 429)

    try {
      await http.post('/things', {}, { adapter })
      expect.fail('request should reject')
    } catch (error) {
      expect(error).toMatchObject({
        status: 429,
        code: 'HTTP_ERROR',
        message: 'Slow down a little.',
      })
    }
  })

  it('degrades a non-JSON error body to a sane ApiError', async () => {
    const adapter = failingAdapter('<html><body>502 Bad Gateway</body></html>', 502)

    try {
      await http.post('/things', {}, { adapter })
      expect.fail('request should reject')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      expect(error).toMatchObject({
        status: 502,
        code: 'HTTP_ERROR',
        message: 'The request could not be completed.',
        name: 'ApiError',
      })
    }
  })
})

describe('getApiErrorMessage', () => {
  it('prefers a curated copy over the server message', () => {
    expect(getApiErrorMessage('AUTH_INVALID_CREDENTIALS', 401, 'raw backend detail')).toBe(
      'The email or password is incorrect.',
    )
  })

  it('has an explicit fallback for HTTP_ERROR and validation codes', () => {
    expect(getApiErrorMessage('HTTP_ERROR', 400)).toBe('The request could not be completed.')
    expect(getApiErrorMessage('VALIDATION_FAILED', 422)).toBe(
      'Check the highlighted fields and try again.',
    )
  })
})

// ---------------------------------------------------------------------------
// Network vs validation error distinction (#145)
// ---------------------------------------------------------------------------
// The acceptance criterion requires that network errors and validation errors
// remain *distinct* — both as ApiError instances but with different codes and
// status values — so that callers (e.g. useFormSubmission) can categorise them
// and announce them accessibly.
// ---------------------------------------------------------------------------

describe('network errors are distinct from validation errors (#145)', () => {
  it('produces a NETWORK_ERROR ApiError with a null status when the network is unavailable', async () => {
    try {
      await http.get('/things', { adapter: networkAdapter })
      expect.fail('should have thrown')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      expect((error as ApiError).code).toBe('NETWORK_ERROR')
      expect((error as ApiError).status).toBeNull()
      expect((error as ApiError).fieldErrors).toEqual({})
    }
  })

  it('produces a TIMEOUT ApiError with a null status on request timeout', async () => {
    try {
      await http.get('/things', { adapter: timeoutAdapter, skipRetry: true })
      expect.fail('should have thrown')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      expect((error as ApiError).code).toBe('TIMEOUT')
      expect((error as ApiError).status).toBeNull()
      expect((error as ApiError).fieldErrors).toEqual({})
    }
  })

  it('produces a VALIDATION_FAILED ApiError with status 422 and populated fieldErrors', async () => {
    const adapter = failingAdapter(
      {
        code: 'VALIDATION_FAILED',
        errors: [{ path: ['username'], message: 'Username is already taken.' }],
      },
      422,
    )

    try {
      await http.post('/register', {}, { adapter })
      expect.fail('should have thrown')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      expect((error as ApiError).code).toBe('VALIDATION_FAILED')
      expect((error as ApiError).status).toBe(422)
      expect((error as ApiError).fieldErrors).toEqual({ username: 'Username is already taken.' })
    }
  })

  it('network and validation errors are both ApiErrors but differ in code, status and fieldErrors', async () => {
    // Network error
    let networkError: ApiError | null = null
    try {
      await http.get('/things', { adapter: networkAdapter })
    } catch (err) {
      if (isApiError(err)) networkError = err
    }

    // Validation error
    const validationAdapter = failingAdapter(
      { code: 'VALIDATION_FAILED', errors: [{ path: ['email'], message: 'Invalid email.' }] },
      422,
    )
    let validationError: ApiError | null = null
    try {
      await http.post('/register', {}, { adapter: validationAdapter })
    } catch (err) {
      if (isApiError(err)) validationError = err
    }

    expect(networkError).not.toBeNull()
    expect(validationError).not.toBeNull()

    // Both are ApiErrors
    expect(networkError).toBeInstanceOf(ApiError)
    expect(validationError).toBeInstanceOf(ApiError)

    // But they differ in every dimension a UI would use to categorise them
    expect(networkError!.code).toBe('NETWORK_ERROR')
    expect(validationError!.code).toBe('VALIDATION_FAILED')

    expect(networkError!.status).toBeNull()
    expect(validationError!.status).toBe(422)

    expect(networkError!.fieldErrors).toEqual({})
    expect(Object.keys(validationError!.fieldErrors).length).toBeGreaterThan(0)
  })
})
