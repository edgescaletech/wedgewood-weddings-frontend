import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { API_BASE_URL } from "../config.js";
import { usePasswordStrength } from "../components/usePasswordStrength.js";
import PasswordChecklist from "../components/PasswordChecklist.jsx";
import { minimumLength, validatePasswords } from "../components/password-policy.js";
import PasswordInput from "../components/PasswordInput.jsx";
import NewPasswordField from "../components/NewPasswordField.jsx";
import { invitationAction } from "./requests.js";
import "../../style.css";
import "../pages/login.css";
import "./invite.css";

const token = window.__wedgewoodInvite || "";
delete window.__wedgewoodInvite;
const inviteHeadings = {
  unavailable: "Invitation unavailable",
  details: "Welcome to Wedgewood",
  password: "Create your password",
  verify: "Verify your email",
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
  const strength = usePasswordStrength(step === "password", password);
  const [confirmation, setConfirmation] = useState("");
  const canSetPassword = step === "password" && !validatePasswords(password, confirmation, strength);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [canRetryLookup, setCanRetryLookup] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);

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
          setResendCooldown(Number(result.retryAfterSeconds) || 0);
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
    if (!resendAt) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setResendSeconds(remaining);
      if (!remaining) setResendAt(0);
    }, 250);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  function setResendCooldown(seconds) {
    setResendAt(seconds > 0 ? Date.now() + seconds * 1000 : 0);
    setResendSeconds(seconds);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const action = invitationAction(step, {
      invitationId: profile.invitationId, code, password, confirmation, strength, minimumLength,
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
      if (path === "/invite/send-code") {
        const delay = Number(response.headers.get("Retry-After"));
        if (delay > 0 || response.ok || response.status === 429) {
          setResendCooldown(delay > 0 ? delay : 30);
        }
        if (response.ok) {
          setCode("");
          setStep("verify");
          return;
        }
      }
      if (response.ok) {
        setPassword("");
        setConfirmation("");
        setCode("");
        if (path === "/invite/password") {
          window.location.replace("/login#invite-complete");
          return;
        }
        setStep("password");
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
            {["details", "password", "verify"].includes(step) && profile && (
              <form className="login-form" onSubmit={submit}>
                <div className="invite-identity">
                  <div>
                    <label htmlFor="invite-name">Name</label>
                    <input id="invite-name" value={profile.displayName} title={profile.displayName} readOnly />
                  </div>
                  <div>
                    <label htmlFor="invite-email">Invited email</label>
                    <input
                      id="invite-email"
                      type="email"
                      autoComplete="username"
                      value={profile.email}
                      title={profile.email}
                      readOnly
                    />
                  </div>
                </div>
                {step === "password" ? (
                  <>
                    <NewPasswordField
                      id="invite-password"
                      describedBy="invite-password-help"
                      password={password}
                      busy={busy}
                      maxLength={256}
                      onChange={setPassword}
                      onGenerate={(generated) => {
                        setPassword(generated);
                        setConfirmation(generated);
                        setError("");
                      }}
                    />
                    <label htmlFor="invite-password-confirm">Confirm password</label>
                    <PasswordInput
                      id="invite-password-confirm"
                      aria-describedby="invite-password-help"
                      autoComplete="new-password"
                      required
                      maxLength={256}
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                    />
                    <PasswordChecklist id="invite-password-help" password={password} confirmation={confirmation} strength={strength} />
                  </>
                ) : step === "verify" && (
                  <>
                    <p className="login-explanation">Enter the code sent to your email.</p>
                    <label htmlFor="invite-code">Verification code</label>
                    <input id="invite-code" autoComplete="one-time-code" inputMode="numeric" required
                      pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))} />
                    <button
                      className="login-secondary"
                      type="button"
                      disabled={busy || resendSeconds > 0}
                      onClick={() => advance("/invite/send-code", {})}
                    >
                      {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
                    </button>
                  </>
                )}
                {error && <p className="login-alert" role="alert">{error}</p>}
                <button className="login-button" type="submit" disabled={busy || (step === "details" && resendSeconds > 0) || (step === "password" && !canSetPassword)}
                  aria-describedby={step === "password" ? "invite-password-help" : undefined}>
                  {busy
                    ? "Working…"
                    : step === "details" && resendSeconds > 0
                      ? `Try again in ${resendSeconds}s`
                      : { details: "Continue", verify: "Verify email", password: "Set password" }[step]}
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
