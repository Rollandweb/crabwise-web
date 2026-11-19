# Architecture

This document describes the implemented Lumora browser client. The project is a React 19 and TypeScript single-page app built with Vite, React Router, TanStack Query, Zustand, Tailwind CSS, and Vitest. Vite serves the development app on port 5173 by default and writes production output to `dist/`.

## Application shell and routes

`src/main.tsx` mounts the application, providers, and global styles. `src/App.tsx` defines the browser routes, shared layout, lazy-loaded pages, authentication guards, not-found page, and development-only `/style-guide` route. Public pages include the landing page, artist profiles, categories, email verification, and guest authentication forms. Account, purchase, listing, wallet, and payout pages are guarded in the client with `RequireAuth` or the artist guard.

Client guards are navigation controls, not authorization boundaries. The API must validate identity, permissions, ownership, and transaction state for every protected operation.

## Source layout

| Location | Responsibility |
| --- | --- |
| `src/features/auth/` | Authentication pages, session and wallet state, API services, and route guards |
| `src/features/profile/` | Artist profiles, profile editing, favorites, and profile services |
| `src/features/marketplace/` | Category pages, artwork listing forms, checkout, and marketplace utilities |
| `src/features/orders/`, `payments/`, `transactions/`, `portfolio/` | Purchases, payment flows, transaction history, and artist withdrawals |
| `src/features/commissions/`, `messaging/`, `notifications/` | Supporting feature modules and feature-specific types/utilities |
| `src/components/` | Shared layout, navigation, forms, CSV import, image upload, and reusable UI |
| `src/services/` | Shared HTTP client and request validation |
| `src/stores/` | Shared query client and UI state |
| `src/hooks/` | Cross-feature React hooks |
| `src/config/` | Runtime environment, Stellar settings, assets, and feature flags |
| `src/lib/`, `src/types/` | Framework-independent helpers and shared API/domain types |
| `api/` | Small serverless API handlers for artist, marketplace, and portfolio lookups |
| `docs/` | Project documentation |

Features are organized around user-facing domains. Prefer a feature's public `index.ts` for cross-feature imports; route-level lazy imports in `App.tsx` intentionally load concrete page modules so their code stays in separate chunks. Keep shared presentation in `components/ui` and shared, domain-neutral behavior in `lib`, `hooks`, or `services`.

## Forms, uploads, and imports

Forms use React Hook Form and Zod where appropriate. Shared request validation in `src/services/requestValidation.ts` checks API paths and applies client-side request limits; the server still needs its own validation and rate limiting.

The CSV flow in `src/components/ImportCSV.tsx` parses the selected file, shows a preview, and waits for explicit confirmation before invoking the import callback. `src/lib/csvImport.ts` enforces the `.csv` extension and supported MIME types when supplied, a 2 MiB file limit, a default limit of 100 data rows and 10 columns, a header row, and valid CSV structure. Imported cells are sanitized and spreadsheet-formula prefixes are neutralized. These checks reduce accidental or unsafe client-side input; they do not replace server-side validation.

Image uploads are handled by the profile image-upload service and marketplace deliverable flows. Validate file content, authorization, storage access, and size again at the API/storage boundary.

## Configuration and commands

Copy `.env.example` to `.env`. `VITE_API_URL`, `VITE_STELLAR_NETWORK`, and `VITE_APP_URL` are required. The development fallback values target a local API at port 4000, Stellar Testnet, and the Vite app at port 5173. Production builds require explicit valid values, and `VITE_API_URL` must be HTTPS. Invalid production configuration is surfaced through the configuration error screen.

Optional `VITE_FF_MESSAGING`, `VITE_FF_NOTIFICATIONS`, and `VITE_FF_ADVANCED_FILTERS` values override feature defaults. Feature configuration can also consume remote configuration; unset values do not imply that every feature is enabled.

The package manager is npm 10.9.2. The supported project scripts are:

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format:check
npm run type-check
npm test
npm run check
```

`npm run check` runs lint, formatting, type checking, tests, and a production build. Tests use Vitest with the configured browser-like test environment.

## Reliability and security boundaries

- Every `VITE_*` value is compiled into client-visible code. Store no API secrets, passwords, tokens, or signing keys in frontend environment variables.
- Production API traffic must use HTTPS. The browser client sends bearer credentials to the configured API; HTTP client error handling redacts sensitive URL details before reporting errors.
- Session state and tokens are client-side and can be inspected by the browser user. `sessionStorage` session identity/lifetime tracking is not a substitute for server-side token validation, revocation, or authorization.
- Wallet signing is delegated to the connected Stellar wallet. Never treat a public wallet address or client-reported transaction status as proof of permission or settlement; verify relevant state with the trusted API/network.
- User-provided text is sanitized for display where applicable. Sanitization is defense in depth, not a replacement for context-aware output encoding or API validation.
- CSV limits, request-path checks, and client-side rate limits are usability safeguards. Attackers can bypass the browser, so enforce resource limits and abuse controls on the server too.
- Do not execute user code in the browser or treat client state as trusted. Any future execution or financial decision must be performed and validated by an appropriately isolated backend or on-chain contract.

## Tests and maintenance

Tests are kept near the code they cover or in feature-specific test directories. Existing tests cover routes, API clients, form behavior, import parsing, security-sensitive utilities, and feature flows. Update the route and environment descriptions here and in the README when implementation changes.
