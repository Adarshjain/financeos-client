# FinanceOS E2E Testing Harness

This directory contains the Playwright end-to-end (E2E) testing harness for FinanceOS. It exercises the production client against the built Spring Boot jar, a dedicated throwaway Oracle container, and a WireMock server.

---

## Hard Rules

1. **Never touch the dev Oracle on port 1521.** Every E2E test run uses a dedicated throwaway `gvenzl/oracle-free:23-slim` container on port **1522** (`FREEPDB1`). The dev database on 1521 must never be modified or stopped.
2. **Never source `financeos-server/.env`.** All server environment variables for E2E are synthetic and committed in `e2e/env/server.e2e.env`.
3. **Fixtures are 100% synthetic; never a real document.** Both repos are public; no real financial statements, credentials, or exports may ever be committed.

---

## Topology & Ports

| Component | Port | Description |
|-----------|------|-------------|
| Client (Next.js) | `6970` | Production build (`next start -p 6970`) |
| Backend (Spring Boot) | `6969` | Built jar (`backend-1.0.0.jar`) with profile `e2e` |
| Oracle Database | `1522` | `gvenzl/oracle-free:23-slim`, user `FINANCEOS` + `CHAT_RO` |
| WireMock | `8089` | Outbound external HTTP service mock |

---

## Commands

### One-Command Flow
```bash
npm run e2e
```
Or to re-compile the backend jar first:
```bash
npm run e2e:build
```
This single command:
1. Starts the throwaway Oracle (1522) and WireMock (8089) via Docker Compose.
2. Verifies the `CHAT_RO` database user via `check-chat-ro.sh`.
3. Builds the server jar if missing or if `--build` is specified.
4. Starts the server jar with profile `e2e` on port 6969 and waits for `/actuator/health`.
5. Builds and starts the production Next.js client on port 6970 and waits for `/login`.
6. Executes Playwright test suites (API project, UI desktop, UI mobile).
7. Tears down everything cleanly.

### Iteration Loop (`--keep` and UI mode)
To leave the stack running while writing or debugging tests:
```bash
# Start stack and keep it running
npm run e2e:keep

# Run API tests only (fast, gates skipped)
npm run e2e:api

# Run browser tests only (gates skipped)
npm run e2e:browser

# Launch Playwright Interactive UI (gates skipped)
npm run e2e:ui

# When done, tear down the environment
npm run e2e:down
```

> **Note on Coverage Gates:** `E2E_SKIP_GATES=1` is automatically set by `run-local.sh` when `--api` or `--browser` is passed, and by the npm scripts `e2e:api`, `e2e:browser`, and `e2e:ui`. The full test run (`npm run e2e`) and CI enforce all coverage gates.

---

## Coverage Gates and Allowlists

The harness enforces mechanical coverage gates in `e2e/global-teardown.ts`:
1. **API Gate:** Every OpenAPI operation defined in `src/lib/api/openapi.yaml` must have at least one successful hit (`ok >= 1` in `/api/e2e/coverage`) recorded by the backend, unless explicitly listed in `e2e/coverage/api-allowlist.json`.
2. **Route Gate:** Every `page.tsx` client route in `src/app` must be visited by the UI test suite, unless listed in `e2e/coverage/routes-allowlist.json`.
3. **Coverage Summary:** Generates `e2e/test-results/coverage-summary.md` and displays metrics on console.

### Allowlist Rules
- Every entry in `e2e/coverage/api-allowlist.json` (`{ method, path, reason, phase }`) and `e2e/coverage/routes-allowlist.json` (`{ route, reason, phase }`) must have a non-empty `reason` and target `phase` (e.g. 5–15).
- **Stale Entries Fail the Run:** An allowlist entry that has become covered will cause the coverage gate to fail with `remove from allowlist`.
- **Exit Criterion:** Shrinking the allowlist is a mandatory exit criterion for each module phase.
- Negative sweep exceptions live in `e2e/coverage/sweep-allowlist.json` (`{ method, path, reason }`), reserved only for legitimate architectural deviations.

## Reports and Logs

- **Playwright HTML Report:** `e2e/playwright-report/index.html` (view with `npm run e2e:report`)
- **JUnit XML Report:** `e2e/test-results/junit.xml`
- **Backend Logs:** `e2e/logs/server.log`
- **Client Logs:** `e2e/logs/client.log`

---

## Test Fixtures & User Scoping

- **Default (`worker-scoped`):** Each Playwright worker is automatically provisioned with a unique `user` (`{ email, password, cookie }`) and pre-configured typed `api` client. This is the default and recommended choice for most tests, as individual tests create their own entities.
- **`freshUser(request, label)`:** When a test asserts on lists that must start completely empty (e.g. asserting that an accounts or transactions list has 0 items before creation), call `freshUser(request, 'fresh-label')` in `test.beforeAll` or directly in the test to ensure zero entity collisions.

---

## Adding WireMock Stubs

JSON mappings live in `e2e/stubs/wiremock/mappings/` and static payload files in `e2e/stubs/wiremock/__files/`.
Example mapping (`e2e/stubs/wiremock/mappings/example.json`):
```json
{
  "request": {
    "method": "GET",
    "url": "/example-service/data"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": {
      "key": "value"
    }
  }
}
```

---

## Scripting the LLM

Under the `e2e` profile, backend calls to LLM providers are handled deterministically by `ScriptedLlmClient`. You can queue canned responses or inject errors using control helpers:
```ts
import { scriptLlm, setLlmMode, llmCalls, resetLlm } from '../fixtures/control';

// Set strict mode (fails if an unscripted LLM request is made)
await setLlmMode(api, 'STRICT');

// Queue scripted response
await scriptLlm(api, 'categorize', [
  { json: { category: 'Groceries', confidence: 0.95 } }
]);

// Inspect calls made
const calls = await llmCalls(api, 'categorize');

// Reset queue and recorded calls
await resetLlm(api);
```

Scripts are consumed FIFO per task. When the server drains work in an order the test cannot control
(the Gmail sync processes one discovery pass's messages in random order), key each entry to its prompt
instead — a keyed entry is served to the first call whose prompt contains the text:
```ts
await scriptLlm(api, 'email-extract', [
  { json: { isTransaction: false }, promptContains: 'Subject: One time password ...' },
  { json: { isTransaction: true, amount: 1250.5, /* … */ }, promptContains: 'Subject: Transaction alert SWIGGY ...' },
]);
```
`e2e/fixtures/seed/gmail.ts` has `extractionFor(mail, answer)` which builds the key from a mail's subject.

---

## Google and Gmail (played by WireMock)

Under the `e2e` profile every Google endpoint the server talks to resolves to WireMock
(`GOOGLE_*_URL`, `GMAIL_AUTH_URL`, `GMAIL_TOKEN_URL`, `GMAIL_API_ROOT_URL` in `env/server.e2e.env`):

- **Consent screen** — static mapping `google-consent.json`: `GET /google/o/oauth2/v2/auth` answers
  `302 {redirect_uri}?code=e2e-code-{state}&state={state}`, so a real browser can click *Sign in with
  Google* or *Add Account* and complete the round trip offline. A catch-all `POST /google/oauth2/revoke`
  lives in the same file.
- **Identities** — everything that needs a Google account is registered per test through the admin API
  by `e2e/fixtures/google-stubs.ts`:
  `registerIdentity()` mints exact authorization codes (`identity.codes[i]`, priority 1), the refresh
  grant, `userinfo`, and the Gmail `profile`, all keyed by a unique access token `AT-<id>`.
  `registerMailbox(identity, messages)` serves `messages.list` (any `q`), each message in
  `format=full`, and its attachments. Remove what you registered in `afterAll` with `cleanupIdentity`.
- **Browser flows** mint their code from a server-generated state, so pass `browserSso: true` (client
  callback, port 6970) or `browserGmail: true` (server callback, port 6969) to add a redirect_uri-scoped
  token stub (priority 5). Run browser SSO/Gmail journeys serially per flow and clean up after each.
- `unmatchedCount()` must stay 0 — an unmatched request means a stub is missing or a URL changed.
  `listQueries(identity)` and `requestCount(pattern)` prove what the server sent (e.g. `after:`/`before:`
  in Gmail listings, one revoke per connection on account deletion).
- **Sync ordering** — creating an account or sender enqueues a `GMAIL_SYNC` job once a connection exists
  (AFTER_COMMIT events). Seed accounts and senders *before* connecting, and call
  `waitForGmailJobsIdle(api)` after any later change before asserting ledger state.
