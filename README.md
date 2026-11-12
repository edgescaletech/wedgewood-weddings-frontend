# Wedgewood Weddings Frontend

React frontend for the venue scheduling prototype. Existing page markup and page controllers are retained to preserve the current workflow and Salesforce API behavior. The Go backend is unchanged.

## Run locally

1. Start the Go backend. By default it listens on `http://localhost:8080`.
2. From this directory, install dependencies once and start the frontend:

   ```sh
   npm install
   make run
   ```

3. Configure the backend `.env` with `APP_URL=http://localhost:3000`, then open `http://localhost:3000/login/`. The login form submits credentials to the backend, which authenticates them with WorkOS and sets a session cookie. The frontend sends that cookie with event requests. The custom password flow does not yet support additional email verification, MFA, SSO, or password reset challenges. New accounts require activation by an administrator.

The frontend uses the Go API at `http://localhost:8080` when running locally. In deployment, configure `window.API_BASE_URL` for the backend environment.

## Build

```sh
npm run build
```

The static production files are written to `dist/`.
