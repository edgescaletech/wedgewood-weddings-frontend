# Wedgewood Weddings Frontend

Static HTML, CSS, and JavaScript webpage for the venue scheduling prototype.

## Run locally

1. Start the backend API in the backend repository. By default it listens on `http://localhost:8080`.
2. From this directory, start the webpage:

   ```sh
   make run
   ```

3. Open `http://localhost:3000` in a browser.

The frontend requests event data from the Go backend. For local development, `app.js` uses `http://localhost:8080` when the webpage runs on another localhost port. In deployment, configure the API base URL for the backend environment.

## Current scope

The prototype focuses on displaying Salesforce event information. The final event fields, authentication, role/venue permissions, staffing workflow, and ADP integration are still being discussed or designed.
