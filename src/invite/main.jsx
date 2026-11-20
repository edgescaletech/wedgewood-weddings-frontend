import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { API_BASE_URL } from "../config.js";
import PasswordInput from "../components/PasswordInput.jsx";
import { generatePassword } from "./password.js";
import { invitationAction } from "./requests.js";
import "../../style.css";
import "../pages/login.css";
import "./invite.css";

const token = window.__wedgewoodInvite || "";
delete window.__wedgewoodInvite;
const configuredMinimum = Number(import.meta.env.VITE_WORKOS_PASSWORD_MIN_LENGTH);
const minimumLength =
  Number.isInteger(configuredMinimum) && configuredMinimum >= 1 && configuredMinimum <= 256
    ? configuredMinimum
    : 8;

const inviteHeadings = {
  unavailable: "Invitation unavailable",
  details: "Welcome to Wedgewood",
  password: "Create your password",
  verify: "Verify your email",
  complete: "Setup complete",
};

async function postAuth(path, body, signal) {
  return fetch(`${API_BASE_URL}/auth${path}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

function InvitePage() {
  const [step, setStep] = useState("loading");
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [canRetryLookup, setCanRetryLookup] = useState(false);
  const [resendAt, setResendAt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStep("loading");
    setError("");
    setCanRetryLookup(false);

    async function loadInvite() {
      try {
        const response = await postAuth("/invite", { token }, controller.signal);
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (response.ok) {
          setProfile(result);
          setStep(result.step);
        } else {
          setError(result.error || "Unable to open this invitation.");
          setCanRetryLookup(response.status >= 500);
          setStep("unavailable");
        }
      } catch {
        if (controller.signal.aborted) return;
        setError("Unable to reach the server. Try again.");
        setCanRetryLookup(true);
        setStep("unavailable");
      }
    }

    loadInvite();
    return () => controller.abort();
  }, [lookupAttempt]);

  useEffect(() => {
    if (step !== "complete") return;
    const timer = window.setTimeout(() => window.location.replace("/login"), 5000);
    return () => window.clearTimeout(timer);
  }, [step]);

  function generate() {
    const generated = generatePassword(minimumLength);
    setPassword(generated);
    setConfirmation(generated);
    setError("");
    setCopyStatus("Save this password before continuing.");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopyStatus("Password copied.");
    } catch {
      setCopyStatus("Could not copy automatically. Reveal your password and copy it manually.");
    }
  }

  useEffect(() => {
    if (!resendAt) return;
    const timer = window.setTimeout(() => setResendAt(0), Math.max(0, resendAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [resendAt]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const action = invitationAction(step, {
      invitationId: profile.invitationId, code, password, confirmation, minimumLength,
    });
    if (action.error) {
      setError(action.error);
      return;
    }
    await advance(action.path, action.body);
  }

  async function advance(path, body) {
    setBusy(true);
    setError("");
    try {
      const response = await postAuth(path, body);
      if (path === "/invite/send-code" && (response.ok || response.status === 429)) {
        const delay = Number(response.headers.get("Retry-After")) || 60;
        setResendAt(Date.now() + delay * 1000);
        setCode("");
        setStep("verify");
        if (!response.ok) setError("Wait before requesting another code. If you received a code, enter it below.");
        return;
      }
      if (response.ok) {
        setPassword("");
        setConfirmation("");
        setCode("");
        setCopyStatus("");
        setStep(path === "/invite/verify" ? "password" : "complete");
        return;
      }
      const result = await response.json().catch(() => ({}));
      setError(result.error || "Unable to finish setup. Try again.");
      if ([404, 409, 410].includes(response.status)) {
        setPassword("");
        setConfirmation("");
        setStep("unavailable");
      } else if (response.status === 401 && path === "/invite/password") {
        setPassword("");
        setConfirmation("");
        setStep("details");
      }
    } catch {
      setError("Unable to reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell invite-shell">
      <div className="invite-form-pane">
        <div className="invite-layout">
          <a className="login-brand" href="/login" aria-label="Wedgewood Scheduling sign-in">
            <span className="login-brand-mark" aria-hidden="true">W</span>
            <span>
              <strong>WEDGEWOOD</strong>
              <small>Venue scheduling</small>
            </span>
          </a>
          <section className="login-card invite-card" aria-labelledby="invite-title" aria-busy={busy}>
            {step === "loading" ? (
              <p className="invite-loading" id="invite-title" role="status">
                <span className="invite-spinner" aria-hidden="true" />
                Checking invitation…
              </p>
            ) : (
              <header className="invite-heading">
                <h1 id="invite-title">{inviteHeadings[step]}</h1>
              </header>
            )}
            {step === "complete" && (
              <div className="login-message" role="status">
                <p>Your password has been created successfully. Sign in to continue.</p>
              </div>
            )}
            {["details", "password", "verify"].includes(step) && profile && (
              <form className="login-form" onSubmit={submit}>
                <label htmlFor="invite-name">Name</label>
                <input id="invite-name" value={profile.displayName} readOnly />
                <label htmlFor="invite-email">Invited email</label>
                <input
                  id="invite-email"
                  type="email"
                  autoComplete="username"
                  value={profile.email}
                  readOnly
                />
                {step === "password" ? (
                  <>
                    <div className="invite-password-heading">
                      <label htmlFor="invite-password">New password</label>
                      <button type="button" disabled={busy} onClick={generate}>
                        Generate
                      </button>
                    </div>
                    <div className="invite-password-field">
                      <PasswordInput
                        id="invite-password"
                        autoComplete="new-password"
                        aria-describedby="invite-password-help"
                        required
                        maxLength={256}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setCopyStatus("");
                        }}
                      />
                      <button
                        className="password-visibility invite-copy-password"
                        type="button"
                        aria-label="Copy password"
                        title="Copy password"
                        disabled={!password || busy}
                        onClick={copy}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          aria-hidden="true"
                        >
                          <rect x="8" y="8" width="12" height="12" rx="2" />
                          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                        </svg>
                      </button>
                    </div>
                    {minimumLength > 0 && (
                      <p className="invite-hint" id="invite-password-help">
                        Use at least {minimumLength} characters.
                      </p>
                    )}
                    <label htmlFor="invite-password-confirm">Confirm password</label>
                    <PasswordInput
                      id="invite-password-confirm"
                      autoComplete="new-password"
                      required
                      maxLength={256}
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                    />
                    {confirmation && password !== confirmation && (
                      <p className="invite-hint">Passwords do not match.</p>
                    )}
                    {copyStatus && <p className="invite-hint" role="status">{copyStatus}</p>}
                  </>
                ) : step === "verify" && (
                  <>
                    <p className="login-explanation">Enter the code sent to your email.</p>
                    <label htmlFor="invite-code">Verification code</label>
                    <input id="invite-code" autoComplete="one-time-code" inputMode="numeric" required
                      pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))} />
                    <button className="login-secondary" type="button" disabled={busy || resendAt > 0} onClick={() => advance("/invite/send-code", {})}>Resend code</button>
                  </>
                )}
                {error && <p className="login-alert" role="alert">{error}</p>}
                <button className="login-button" type="submit" disabled={busy}>
                  {busy ? "Working…" : { details: "Continue", verify: "Verify email", password: "Set password" }[step]}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            )}
            {step === "unavailable" && error && <p className="login-alert" role="alert">{error}</p>}
            {step === "unavailable" && canRetryLookup && (
              <button type="button" className="login-secondary" onClick={() => setLookupAttempt((attempt) => attempt + 1)}>
                Try again
              </button>
            )}
            {step === "complete" && (
              <a className="login-button" href="/login">Continue to sign-in</a>
            )}
          </section>
        </div>
      </div>
      <aside className="login-aside invite-aside">
        <div className="aside-content">
          <h2>
            Great days begin
            <br />
            <em>with great plans.</em>
          </h2>
        </div>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<InvitePage />);
