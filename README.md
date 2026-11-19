# Lumora Web

Lumora is a Stellar-connected art marketplace for discovering artists, commissioning and buying artwork, and managing listings, purchases, and payouts. This repository contains the browser client; API-backed account, profile, marketplace, and transaction operations require the Lumora API configured through `VITE_API_URL`.

## Implemented features

- Browse creator profiles and artwork categories.
- Register, sign in, verify email, and manage password recovery.
- Edit a profile, manage favorites, and connect Stellar wallets.
- Create, edit, and manage artwork listings, including image upload and cropping.
- Check out artwork, review payment results, and view order confirmations and purchases.
- View transaction history and withdraw eligible artist earnings to a linked wallet.
- Use responsive navigation, accessible form feedback, theme controls, and a development-only style guide.
- Import CSV data with a review-before-confirm flow. The importer validates file type and size, row and column limits, headers, and sanitizes cell values before passing them to the import callback.

Messaging, notifications, and advanced filters are feature-flagged capabilities. Their environment overrides are optional and default off unless enabled by the app's feature configuration or remote configuration.

## Routes

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Marketplace landing page |
| `/login`, `/register` | Guest | Sign-in and account registration |
| `/forgot-password`, `/reset-password` | Guest | Password recovery |
| `/verify-email` | Public | Email verification |
| `/artists/:username` | Public | Artist profile and portfolio |
| `/category/:slug` | Public | Artwork category landing page |
| `/profile/edit` | Signed in | Edit profile |
| `/dashboard`, `/artist` | Signed in | Account dashboard |
| `/favorites` | Signed in | Saved artists and artwork |
| `/transactions` | Signed in | Transaction history |
| `/earnings/withdraw` | Signed in | Withdraw artist earnings |
| `/purchases` | Signed in | Purchases and deliverables |
| `/order/confirmation` | Signed in | Order confirmation |
| `/checkout/:artworkId` | Signed in | Artwork checkout |
| `/payment/result` | Signed in | Payment result |
| `/artist/listings` | Signed in | Manage listings |
| `/artist/listings/new` | Signed in | Create a listing |
| `/artist/listings/:listingId/edit` | Signed in | Edit a listing |
| `/settings/wallets` | Signed in | Manage linked wallets |
| `/style-guide` | Development only | UI component and design-system preview |

Unknown routes show a not-found page. Authentication guards are enforced in the client; the API must independently authorize requests and transactions.

## Requirements and setup

- Node.js `^20.19.0` or `>=22.12.0`
- npm 10.9.2 (the version declared by `packageManager`)
- A reachable Lumora API and a Stellar wallet for wallet-dependent flows

```bash
git clone https://github.com/Dfunder/crabwise-web.git
cd crabwise-web
npm install
Copy-Item .env.example .env
npm run dev
```

The development server is available at `http://localhost:5173`. On macOS or Linux, replace the copy command with `cp .env.example .env`.

### Environment

The three required variables are `VITE_API_URL`, `VITE_STELLAR_NETWORK` (`testnet` or `mainnet`), and `VITE_APP_URL`. `.env.example` contains local development values. Production builds must set these explicitly, and the API URL must use HTTPS. Missing or invalid configuration is reported by the app's configuration error screen rather than silently falling back to a production localhost or testnet endpoint.

Optional overrides are `VITE_FF_MESSAGING`, `VITE_FF_NOTIFICATIONS`, and `VITE_FF_ADVANCED_FILTERS` (`true` or `false`). Restart Vite after changing environment values.

Every `VITE_*` value is embedded in the public browser bundle. Never put credentials, private keys, signing secrets, or other secrets in these variables.

### Available commands

```bash
npm run dev          # Start the Vite development server
npm run build        # Create the production bundle in dist/
npm run preview      # Serve the production bundle locally
npm run lint         # Run ESLint
npm run format:check # Check formatting with Prettier
npm run type-check   # Run the TypeScript project build
npm test             # Run the Vitest suite
npm run check        # Run lint, formatting, type, test, and build checks
```

## Architecture and security

The app is a React 19 and TypeScript single-page application built with Vite, React Router, TanStack Query, Zustand, Tailwind CSS, and Vitest. See [the architecture guide](docs/architecture.md) for its source layout and data flow.

The browser client does not custody Stellar private keys: transaction signing is performed by the connected wallet. Client-side route guards and validation improve the user experience but are not security boundaries; the API must authenticate and authorize every protected operation. Use HTTPS in production because bearer session tokens are sent to the API. Browser storage and client code are accessible to the user and must not be treated as secret storage.

User-provided text is sanitized before display where applicable. CSV import validates and sanitizes input but cannot make imported data trustworthy for downstream systems. Continue to validate and authorize data on the server. Report security concerns through the repository's configured responsible-disclosure channel.

## Development

Feature modules live under `src/features`; shared UI, hooks, services, configuration, and utilities are under `src/`. Add or update documentation when routes, environment variables, or user-visible capabilities change.
