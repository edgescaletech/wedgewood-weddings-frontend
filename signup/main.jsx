import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import PasswordInput from "../src/components/PasswordInput.jsx";
import "./signup.css";

const apiBase =
  window.API_BASE_URL ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : "");

// This temporary page creates the identity; the existing login handles verification.
function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Generate locally with cryptographic randomness; never send it anywhere
  // until the user submits the signup form.
  function generatePassword() {
    if (!window.crypto?.getRandomValues) {
      setError("Password generation is unavailable in this browser.");
      return;
    }
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@";
    const randomValues = new Uint8Array(20);
    let candidate;
    do {
      window.crypto.getRandomValues(randomValues);
      candidate = Array.from(randomValues, (value) => alphabet[value & 63]).join("");
    } while (!/[A-Z]/.test(candidate) || !/[a-z]/.test(candidate) || !/[0-9]/.test(candidate) || !/[!@]/.test(candidate));

    setPassword(candidate);
    setConfirmation(candidate);
    setGenerated(true);
    setPasswordSaved(false);
    setError("");
  }

  // Send credentials directly to the backend, which passes them to WorkOS.
  async function createAccount(event) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    if (generated && !passwordSaved) {
      setError("Please save your generated password before creating your account.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Unable to create your account. Please try again.");
        return;
      }
      setPassword("");
      setConfirmation("");
      setComplete(true);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="signup-layout">
      <section className="signup-main">
        <div className="signup-content">
          <p className="eyebrow">● &nbsp; TEAM WORKSPACE</p>
          <h1>A little more room <em>to make it special.</em></h1>
          <p className="intro">Your week, your team, and every detail in one place.</p>
          <div className={`signup-card${generated && !complete ? " signup-card-generated" : ""}`}>
            {complete ? (
              <>
                <h2>Account created</h2>
                <p>Sign in to continue. You may be asked to verify your email.</p>
                <a className="signup-button" href="/login">Go to sign in <span>→</span></a>
              </>
            ) : (
              <>
                <h2>Create your account</h2>
                <p>Join your Wedgewood scheduling workspace.</p>
                <form onSubmit={createAccount}>
                  <label htmlFor="email">Email address</label>
                  <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                  <label htmlFor="password">Password</label>
                  <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setGenerated(false); setPasswordSaved(false); }} required maxLength={1024} />
                  <button className="generate-password" type="button" onClick={generatePassword}>Generate password</button>
                  {generated && (
                    <label className="password-saved">
                      <input type="checkbox" checked={passwordSaved} onChange={(event) => setPasswordSaved(event.target.checked)} required />
                      <span>I saved my generated password (use the eye to view it).</span>
                    </label>
                  )}
                  <label htmlFor="confirmation">Confirm password</label>
                  <PasswordInput id="confirmation" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required maxLength={1024} />
                  {error && <p className="signup-error" role="alert">{error}</p>}
                  <button className="signup-button" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}<span>→</span></button>
                </form>
                <p className="signup-signin">Already have an account? <a href="/login">Sign in</a></p>
              </>
            )}
          </div>
        </div>
        <footer>© Wedgewood Weddings <span>Made for the moments that matter.</span></footer>
      </section>
      <aside className="signup-aside">
        <div>
          <p className="eyebrow">● &nbsp; THE WORK BEHIND THE CELEBRATION</p>
          <h2>Great days begin <em>with great plans.</em></h2>
          <p>From the first detail to the final celebration, it all starts with a team that’s ready.</p>
        </div>
        <small>THOUGHTFULLY PLANNED</small>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<Signup />);
