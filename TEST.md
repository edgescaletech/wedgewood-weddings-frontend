# Frontend testing

Run all commands from the frontend repository. The Playwright suite covers authentication and authorization. Staffing provides the protected UI for testing sessions, venue switching, and role controls. The suite does not create shifts, approve schedules, publish to ADP, or check labor calculations.

## Install and run

Use Node.js 22 or later.

```sh
npm ci
npx playwright install chromium --no-shell
npm test
npm run build
```

`npm test` runs the Node.js unit tests. `npm run build` verifies the production bundle.

## Run the full Playwright suite

Once the selected env file is configured, run one command from the frontend repository:

```sh
npm run test:e2e:local
```

This loads `.env.e2e.local`. To run against staging, use:

```sh
npm run test:e2e:staging
```

This loads `.env.e2e.staging`. Both commands select all three Playwright projects. Set `E2E_LIVE_AUTH=1` in the selected file to enable real WorkOS tests and signed-out Go checks. Set `E2E_AUTHZ_MUTATIONS=1` there only if the environment and accounts are isolated and you want to include AUTHZ-07. Staging also requires `E2E_STAGING_ISOLATED=1` for Go and live tests.

| Project | Cases | Dependencies |
| --- | ---: | --- |
| `chromium` | 9 | Real frontend with controlled authentication or data responses. Can run without Go, PostgreSQL, or WorkOS. |
| `chromium-go` | 4 | Real frontend and signed-out Go requests. Enable with `E2E_GO_AUTH=1` or `E2E_LIVE_AUTH=1`. |
| `chromium-live` | 17 | Real WorkOS password sign-in, Go session cookies, and PostgreSQL-backed RBAC. Enable with `E2E_LIVE_AUTH=1`. AUTHZ-07 also needs explicit mutation opt-in. |

### Local

```sh
cp .env.e2e.local.example .env.e2e.local
```

For real Go or WorkOS cases, follow the backend repository README to configure WorkOS, migrate local PostgreSQL, and start the API with `make run`. The frontend example expects Vite at `http://localhost:3000` and Go at `http://localhost:8080`. Run `npm run dev` for an existing Vite server or remove `E2E_BASE_URL` to let Playwright manage it on port 4175. Set backend `APP_URL` to the actual browser origin, including its port. Use local HTTP cookie settings and the same loopback hostname for both origins.

### Staging

```sh
cp .env.e2e.staging.example .env.e2e.staging
```

Set `E2E_BASE_URL` and `E2E_API_URL` to the intended HTTPS staging origins. List both origins in `E2E_STAGING_ALLOWED_ORIGINS`. For Go or live execution, confirm the deployment uses an isolated PostgreSQL database and a dedicated WorkOS test environment, then set `E2E_STAGING_ISOLATED=1`. Keep production origins out of the allowlist.

Set `E2E_API_MODE=proxy` when the browser calls the frontend origin and the frontend forwards `/auth` and `/api` to Go. This is also the default managed Vite setup for local Go at port 8080. Use `direct` when the frontend was built with `VITE_API_BASE_URL` set to the Go origin. Direct mode requires same-site hosts and credentialed CORS for the exact frontend origin. Staging uses HTTPS and secure session cookies.

Each runner loads only its selected env file. Shell and CI variables take precedence. The preflight checks the frontend, Go health and signed-out identity where enabled, and the login origin for live runs. Missing live credentials cause a configuration error.

### Accounts and venue data

Use exactly three dedicated, linked WorkOS accounts.

| Env variables | Local application account |
| --- | --- |
| `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` | Active Global Admin |
| `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` | Active mixed-role user. General Manager at Hofmann Ranch, Venue Scheduler at Tapestry House, no access to Abbey Catering. |
| `E2E_INACTIVE_EMAIL`, `E2E_INACTIVE_PASSWORD` | Inactive linked user with otherwise valid credentials |

For authorization runs, set `E2E_AUTHZ_WEEK` to an actual Monday in `YYYY-MM-DD` format with distinct existing events in all three venues. Replace any example date with a week in the selected environment. The tests resolve venue IDs through the backend. Override names with `E2E_AUTHZ_VENUE_A`, `E2E_AUTHZ_VENUE_B`, and `E2E_AUTHZ_VENUE_C` if needed. The labor access tests need no accounting-period or labor-target seed data.

AUTHZ-07 is skipped unless `E2E_AUTHZ_MUTATIONS=1`. Only enable it on isolated infrastructure. It uses separate Admin and mixed-role browser contexts and modifies only the mixed-role fixture's Venue A assignment. It restores that assignment in `finally`, checks Venue B stays assigned, and can leave normal Admin audit entries. Run one mutation-enabled suite per fixture account at a time. If a run is interrupted, verify the Venue A General Manager grant before rerunning.

## Playwright coverage

### Authentication

| ID | Spec under `tests/e2e/auth/` | What it verifies |
| --- | --- | --- |
| AUTHN-01 | `login.spec.js` | Live Admin, GM, and Venue Scheduler scenarios sign in and reach Staffing. Sessions survive reload and a new tab. The two venue roles use the same mixed-role account. |
| AUTHN-02 | `login.spec.js` | Live login with an invalid password is rejected, produces no session, and leaves Staffing protected. |
| AUTHN-03 | `session.spec.js` | Four controlled and four real Go cases cover signed-out access to `/staffing/`, `/goals/`, `/admin/users`, and `/admin/labor-targets`. Protected pages redirect to login. |
| AUTHN-04 | `logout.spec.js` | Cancel leaves the real session valid. Confirmation sends logout, removes the session cookie, and makes `/auth/me` return `401`. Staffing redirects to login. |
| AUTHN-05 | `session.spec.js` | The live test replaces only the browser session cookie with an invalid value and verifies Go rejects it. Controlled cases check expiry while Staffing is open, focus-triggered expiry, and access revalidation that preserves the open menu for an unchanged session. |
| AUTHN-06 | `login.spec.js` | Valid credentials for an inactive linked account cannot establish an application session or open Staffing. |
| AUTHN-07 | `login.spec.js`, `session.spec.js` | Controlled login and identity outages show an error. The session retry case confirms the app rechecks access and recovers when the service responds. |

### Authorization

All authorization cases use real backend responses.

| ID | Spec under `tests/e2e/authorization/` | What it verifies |
| --- | --- | --- |
| AUTHZ-01 | `admin-access.spec.js` | Global Admin grants, access to all fixture venues, Admin Users & access and Labor efficiency targets pages, and successful Admin API reads. |
| AUTHZ-02 | `role-permissions.spec.js` | Venue A General Manager has schedule view, edit, approve, and publish grants. Labor reads and the simulated publish control reflect those grants. |
| AUTHZ-03 | `role-permissions.spec.js` | Venue B Venue Scheduler can view and edit schedules and read labor goals. Approval and publishing grants are absent and the simulated publish control is disabled. |
| AUTHZ-04 | `venue-isolation.spec.js` | Venue C is absent from the picker. A direct Staffing link to Venue C falls back to an allowed venue and shows no Venue C events. |
| AUTHZ-05 | `venue-isolation.spec.js` | The event list and labor APIs deny Venue C with `403`. Existing unauthorized and missing event details return the same generic `404`. Unfiltered events stay within the user's grants. |
| AUTHZ-06 | `role-permissions.spec.js` | Switching Venue A → Venue B → Venue A updates grants, controls, and events without carrying over the previous venue's data. |
| AUTHZ-07 | `permission-revocation.spec.js` | Revoking Venue A during an active session removes its data and controls, denies direct Venue A access, preserves Venue B, and restores the original Venue A grant. |
| AUTHZ-08 | `admin-access.spec.js` | Mixed-role users cannot open Admin routes or call restricted Admin APIs. The role-write probe has an empty payload and checks authorization before validation. |
| AUTHZ-09 | `session-isolation.spec.js` | Signing out as Admin and signing back in as the mixed-role user in the same browser removes Admin grants and access. |
| AUTHZ-10 | `venue-isolation.spec.js` | Labor summary and targets return `401` signed out, `403` at Venue C, and success at Venues A and B. Checks access only. |

## Unit coverage

| File | What it verifies |
| --- | --- |
| [Admin users](test/admin-users.test.js) | Admin tab paths, invite review and retries, role replacement, account status, directory pagination, and venue picker preload and region filters. |
| [Invitation](test/invite.test.js) | Password generation and policy, confirmation, OTP input, and invitation requests that keep identity under server control. |
| [Reset token](test/reset-token.test.js) | Recovery link lifetime, reload, cleanup after completion, and fallback when browser storage is unavailable. |
| [Authorization and date helpers](test/unit_tests.test.js) | Global and venue grants, server-provided roles, Admin page access, and scheduling week calculations. |

The invitation and password-reset checks here are unit tests. The Playwright authentication suite does not complete invitations, email verification, or password recovery.

## Filter tests and read results

```sh
npm run test:e2e:local -- --list
npm run test:e2e:local -- --project=chromium
npm run test:e2e:local -- --grep AUTHZ
npm run test:e2e:staging -- --grep AUTHN
npm run test:e2e:staging -- --grep AUTHZ-07
npm run test:e2e:report
```

Pass Playwright flags such as `--headed`, `--grep`, and `--project` after `--`. A listed case is not an executed case. A skipped live or mutation case does not count as a pass. Keep env files, `test-results/`, and `playwright-report/` out of Git. Controlled tests keep failure screenshots and traces. Go and live projects disable those artifacts and do not save browser session state.

## Verification

- 30 Node.js tests passed and the Vite production build completed.
- Playwright discovered 30 cases. All 9 controlled Chromium cases passed locally.
- Targeted staging runs verified real logout and session isolation, both Admin route guards, and Admin access. A successful full staging run of the current 30-case inventory has not been recorded.
