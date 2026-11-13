# Wedgewood Weddings Frontend

React frontend for the venue scheduling prototype. Existing page markup and page controllers are retained to preserve the current workflow and Salesforce API behavior. The Go backend is unchanged.

## Run locally

1. Start the Go backend. By default it listens on `http://localhost:8080`.
2. From this directory, install dependencies once and start the frontend:

   ```sh
   npm install
   make run
   ```

3. Configure the backend `.env` with `APP_URL=http://localhost:3000`, then open `http://localhost:3000/login/`. The login form submits credentials to the backend, which authenticates them with WorkOS and sets a session cookie. The frontend sends that cookie with event requests. The custom flow supports email verification and password reset. MFA and SSO challenges are not yet supported. New accounts require activation by an administrator.

The frontend uses the Go API at `http://localhost:8080` when running locally. In deployment, configure `window.API_BASE_URL` for the backend environment.

## Build

```sh
npm run build
```

The static production files are written to `dist/`.

## Email verification and password reset

When WorkOS requires email verification, sign in with your email and password, then enter the code sent to your email. A newly created local account remains inactive until an administrator activates it.

Select **Forgot password?** on the login page to request a reset email. In the WorkOS dashboard, configure the password-reset URL under **Applications → your application → Redirects** to point to the frontend, for example `http://localhost:3000/reset-password/` locally. The reset page reads the `token` in the email link and removes it from the address bar before loading external resources. After a successful reset, sign in with your new password.

If the email link still opens an `authkit.app/reset-password` page, the WorkOS application is still using its hosted password-reset URL. Select the correct WorkOS environment and application, update its password-reset URL under **Redirects**, save it, and request a new reset email. Previously sent links retain their original destination. The password-reset URL must point to the frontend page; it is separate from the backend OAuth callback URL. The frontend origin and port must also exactly match the backend `APP_URL`.

The backend must include the verification and reset endpoints. Browser requests use cookies with `SameSite=Lax`, so frontend and backend hosts must be same-site. In production, `vercel.json` forwards `/auth` requests to the development backend, matching the existing `/api` proxy; backend `APP_URL` must match the frontend origin. See the backend README for WorkOS email settings and local configuration.

>jy0$K_e#$e[_6Eh
