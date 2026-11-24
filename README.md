# Wedgewood Weddings Frontend

React frontend for the venue scheduling prototype. Existing page markup and page controllers are retained to preserve the current workflow and Salesforce API behavior. The Go backend is unchanged.

## Run locally

Copy `.env.example` to `.env` before starting the frontend:

```sh
cp .env.example .env
```

Set `VITE_API_BASE_URL` to your backend URL (for example, `http://localhost:8080` locally). Every page uses this shared setting. Leave it empty to send `/api` and `/auth` requests to the frontend origin through a reverse proxy, including the existing Vercel rewrites. The frontend no longer infers a backend address from the browser hostname or reads `window.API_BASE_URL`.

Restart Vite after changing `.env`. For deployment, set the value in the build environment and rebuild; it is embedded in the static files. `VITE_*` values are public, so never include WorkOS keys, database credentials, or other secrets. Keep the backend `APP_URL` set to the frontend origin and use same-site hosts for session cookies.


1. Start the Go backend. By default it listens on `http://localhost:8080`.
2. From this directory, install dependencies once and start the frontend:

   ```sh
   npm install
   make run
   ```

3. Configure the backend `.env` with `APP_URL=http://localhost:3000`, then open `http://localhost:3000/login/`. The login form submits credentials to the backend, which authenticates them with WorkOS and sets a session cookie. The frontend sends that cookie with event requests. The custom flow supports email verification and password reset. MFA and SSO challenges are not yet supported. Invited accounts require Admin activation.

An Admin sends your WorkOS invitation. Set the application's **User invitation URL** to the frontend `/invite` route and enable WorkOS Magic Auth email delivery. Open the link, confirm your read-only name and email, click Continue, and enter the emailed code. Set your password and use `/login` after an Admin activates your account. The short-lived onboarding cookie lets you refresh the password screen. Set `VITE_WORKOS_PASSWORD_MIN_LENGTH` to match your WorkOS password minimum. WorkOS applies its full policy.


The events, staffing, and goals pages check `/auth/me` before loading and redirect signed-out or inactive users to login. The backend independently requires an active session for event API requests. Login and password recovery remain public. The UI enables permission-controlled actions only when the identity response supplies a role and the relevant permission.

`/admin` opens Users & access. The Admin navigation includes **Labor efficiency targets** at `/admin/labor-targets` for users with the global `labor_goals.manage` permission. That page imports labor targets and accounting periods using CSV. The venue cards display illustrative data, as labeled on the page.

## Build

```sh
npm run build
```

The static production files are written to `dist/`.

## Email verification and password reset

When WorkOS requires email verification during sign-in or invitation setup, enter the code sent to your email.

Select **Forgot password?** on the login page to request a reset email. In the WorkOS dashboard, configure the password-reset URL under **Applications → your application → Redirects** to point to the frontend, for example `http://localhost:3000/reset-password/` locally. The reset page reads the `token` in the email link and removes it from the address bar before loading external resources. After a successful reset, sign in with your new password.

If the email link still opens an `authkit.app/reset-password` page, the WorkOS application is still using its hosted password-reset URL. Select the correct WorkOS environment and application, update its password-reset URL under **Redirects**, save it, and request a new reset email. Previously sent links retain their original destination. The password-reset URL must point to the frontend page; it is separate from the backend OAuth callback URL. The frontend origin and port must also exactly match the backend `APP_URL`.

The backend must include the verification and reset endpoints. Browser requests use cookies with `SameSite=Lax`, so frontend and backend hosts must be same-site. In production, `vercel.json` forwards `/auth` requests to the development backend, matching the existing `/api` proxy; backend `APP_URL` must match the frontend origin. See the backend README for WorkOS email settings and local configuration.

>jy0$K_e#$e[_6Eh

## Authentication browser tests

Use Node.js 22 or later, run `npm ci`, and install Chromium with
`npx playwright install chromium --no-shell`.

| Project | Coverage | Opt-in |
| --- | --- | --- |
| `chromium` | Six controlled-response UI cases for route guards, session loss, and outages | Runs by default |
| `chromium-go` | Three signed-out route checks against the deployed Go API | `E2E_GO_AUTH=1` |
| `chromium-live` | Seven credentialed cases covering login, invalid credentials, persistence, logout, invalid session, and inactive accounts | `E2E_LIVE_AUTH=1` also enables Go checks |

The two environment commands load only their selected file. Exported shell or
CI variables take precedence. Pass Playwright options after `--`.

### Local

```sh
cp .env.e2e.local.example .env.e2e.local
npm run test:e2e:local -- --project=chromium --headed
E2E_GO_AUTH=1 npm run test:e2e:local -- --project=chromium-go
E2E_LIVE_AUTH=1 npm run test:e2e:local -- --project=chromium-live
```

The example expects an existing frontend at `http://localhost:3000` and Go at
`http://localhost:8080`. Remove `E2E_BASE_URL` to let Playwright start Vite at
`http://localhost:4175`. In proxy mode, managed Vite forwards `/auth` and `/api`
to port 8080. For an existing frontend, match `E2E_API_MODE` to how it was
started. Use `proxy` when browser requests are same-origin, or `direct` if
`VITE_API_BASE_URL` is set to the Go origin. Use the same loopback hostname
for frontend and backend when making direct browser requests.

For backend runs, start Go against migrated PostgreSQL. For credentialed runs,
match backend `APP_URL` to the browser origin including its port. Use local
HTTP cookie settings and seed events or configure a test Salesforce integration
if Staffing needs event reads.

### Deployed staging

```sh
cp .env.e2e.staging.example .env.e2e.staging
# Fill in the approved staging origins and, for real auth, the fixture credentials.
npm run test:e2e:staging -- --project=chromium --grep AUTHN-07
E2E_STAGING_ISOLATED=1 E2E_GO_AUTH=1 npm run test:e2e:staging -- --project=chromium-go
E2E_STAGING_ISOLATED=1 E2E_LIVE_AUTH=1 npm run test:e2e:staging -- --project=chromium-live
```

Set `E2E_BASE_URL` and `E2E_API_URL` to HTTPS origins on the approved
`E2E_STAGING_ALLOWED_ORIGINS` list. For proxy mode, verify the deployed
frontend rewrites `/auth` and `/api` to the selected staging Go server. For
direct mode, use same-site hosts, credentialed CORS, and the exact allowed
frontend origin. Staging HTTPS requires secure session cookies.

Set `E2E_STAGING_ISOLATED=1` only after checking the deployed Go service uses
an isolated PostgreSQL database and a dedicated WorkOS test environment.
Public health and auth responses cannot identify the database or prove which
Go deployment sits behind a functioning proxy. Keep production hosts out of
the staging allowlist. Local runs accept only loopback origins.

### Credentials and preflight

Configure these three verified, linked WorkOS accounts in the selected file or
through CI secrets. All three pairs are required when live authentication is
explicitly enabled.

| Variables | Account |
| --- | --- |
| `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` | Active global Admin |
| `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` | One active mixed-role user, General Manager at Venue A and Venue Scheduler at Venue B, with no assignment at Venue C |
| `E2E_INACTIVE_EMAIL`, `E2E_INACTIVE_PASSWORD` | Linked WorkOS user deactivated locally |

Preflight checks that the frontend responds. Backend runs also check Go health
and the signed-out response through the configured browser API path.
Credentialed runs check the trusted origin with an empty login request before
submitting credentials. The live scenarios themselves verify that WorkOS and
the linked users are configured correctly and that the frontend receives a
compatible session cookie. An explicitly enabled live run with missing
credentials fails configuration with the missing variable names.

Run `npm run test:e2e:report` to open the latest HTML report. Reports and local
environment files are ignored by Git. Controlled tests keep screenshots and
traces on failure. Real projects disable these artifacts and do not save browser
authentication state.
