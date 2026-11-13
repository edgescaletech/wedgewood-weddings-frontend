import React, { useEffect, useState } from "react";
import PasswordInput from "../components/PasswordInput.jsx";
import "./login.css";

const apiBase =
  window.API_BASE_URL ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : "");

// The reset entry page removes the token from the URL before other resources load.
const isResetPage = window.location.pathname.startsWith("/reset-password");
const resetToken = window.__passwordResetToken || "";
delete window.__passwordResetToken;

export default function Login() {
  const [status, setStatus] = useState(isResetPage ? "signed-out" : "checking");
  const [view, setView] = useState(isResetPage ? "reset" : "login");
  const [code, setCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (isResetPage) return undefined;
    const controller = new AbortController();
    async function checkSession() {
      try {
        const response = await fetch(`${apiBase}/auth/me`, {
          credentials: "include",
          signal: controller.signal,
        });
        const nextStatus = response.ok
          ? "signed-in"
          : response.status === 403
            ? "inactive"
            : response.status === 401
              ? "signed-out"
              : "unavailable";
        setStatus((current) => (current === "checking" ? nextStatus : current));
      } catch (error) {
        if (error.name !== "AbortError")
          setStatus((current) =>
            current === "checking" ? "unavailable" : current,
          );
      }
    }
    checkSession();
    return () => controller.abort();
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setFormError("");
    setStatus("signing-in");
    try {
      const response = await fetch(`${apiBase}/auth/password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setPassword("");
      if (response.status === 202) {
        const body = await response.json().catch(() => ({}));
        if (body.status === "email_verification_required") {
          setStatus("signed-out");
          setView("verify");
          return;
        }
        setFormError("Unable to start verification. Please sign in again.");
        setStatus("signed-out");
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setFormError(body.error || "Unable to sign in. Please try again.");
        setStatus("signed-out");
        return;
      }
      const account = await fetch(`${apiBase}/auth/me`, {
        credentials: "include",
      });
      if (account.ok) window.location.assign("/");
      else if (account.status === 403) setStatus("inactive");
      else {
        setFormError(
          "Signed in, but we could not load your account. Please try again.",
        );
        setStatus("signed-out");
      }
    } catch {
      setPassword("");
      setFormError("Unable to reach the server. Please try again.");
      setStatus("signed-out");
    }
  }

  // Each recovery request sends the backend's HttpOnly challenge/session cookies.
  async function postRecovery(path, body) {
    return fetch(`${apiBase}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function verifyEmail(event) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const response = await postRecovery("/auth/verify-email", {
        code: code.trim(),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setFormError(body.error || "Verification failed. Please try again.");
        return;
      }
      setCode("");
      const account = await fetch(`${apiBase}/auth/me`, {
        credentials: "include",
      });
      if (account.ok) window.location.assign("/");
      else if (account.status === 403) {
        setView("login");
        setStatus("inactive");
      } else
        setFormError(
          "Verified, but we couldn’t load your account. Please sign in again.",
        );
    } catch {
      setFormError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function requestReset(event) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const response = await postRecovery("/auth/forgot-password", {
        email: email.trim(),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setFormError(
          body.error || "Unable to request a reset. Please try again.",
        );
        return;
      }
      setView("reset-sent");
    } catch {
      setFormError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setFormError("");
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await postRecovery("/auth/reset-password", {
        token: resetToken,
        newPassword: password,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setFormError(
          body.error || "Unable to reset your password. Please try again.",
        );
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setView("reset-complete");
    } catch {
      setFormError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setStatus("signing-out");
    try {
      const response = await fetch(`${apiBase}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setStatus(response.ok ? "signed-out" : "logout-error");
    } catch {
      setStatus("logout-error");
    }
  }

  return (
    <main className="login-shell">
      <section className="login-main" aria-labelledby="login-title">
        <a
          className="login-brand"
          href="/"
          aria-label="Wedgewood Scheduling home"
        >
          <span className="login-brand-mark" aria-hidden="true">
            W
          </span>
          <span>
            <strong>WEDGEWOOD</strong>
            <small>Venue scheduling</small>
          </span>
        </a>
        <div className="login-content">
          <div className="login-eyebrow">
            <span /> TEAM WORKSPACE
          </div>
          <h1 id="login-title">
            A little more room
            <br />
            <em>to make it special.</em>
          </h1>
          <p className="login-intro">
            Your week, your team, and every detail in one place. Sign in to get
            started.
          </p>
          <div className="login-card">
            <div className="login-card-heading">
              <div>
                <h2>
                  {view === "verify"
                    ? "Verify your email"
                    : view === "forgot" || view === "reset-sent"
                      ? "Forgot your password?"
                      : view === "reset" || view === "reset-complete"
                        ? "Reset your password"
                        : "Welcome back"}
                </h2>
                <p>
                  {view === "login"
                    ? "Sign in to your scheduling account."
                    : "Your Wedgewood Scheduling account."}
                </p>
              </div>
              <span className="login-lock" aria-hidden="true">
                ↗
              </span>
            </div>
            <div className="login-card-rule" />
            {view === "verify" ? (
              <form className="login-form" onSubmit={verifyEmail}>
                <p className="login-explanation">
                  Enter the verification code sent to your email.
                </p>
                {formError && (
                  <p className="login-alert" role="alert">
                    {formError}
                  </p>
                )}
                <label htmlFor="verification-code">Verification code</label>
                <input
                  id="verification-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
                <button className="login-button" disabled={busy} type="submit">
                  {busy ? "Verifying…" : "Verify email"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
                <button
                  className="login-secondary"
                  type="button"
                  onClick={() => {
                    setView("login");
                    setCode("");
                    setFormError("");
                  }}
                >
                  Back to sign in
                </button>
              </form>
            ) : view === "forgot" ? (
              <form className="login-form" onSubmit={requestReset}>
                <p className="login-explanation">
                  Enter your email and we’ll send a reset link if an account
                  exists.
                </p>
                {formError && (
                  <p className="login-alert" role="alert">
                    {formError}
                  </p>
                )}
                <label htmlFor="reset-email">Email address</label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <button className="login-button" disabled={busy} type="submit">
                  {busy ? "Sending…" : "Send reset link"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
                <button
                  className="login-secondary"
                  type="button"
                  onClick={() => {
                    setView("login");
                    setFormError("");
                  }}
                >
                  Back to sign in
                </button>
              </form>
            ) : view === "reset-sent" ? (
              <div className="login-message" role="status">
                <strong>Check your email</strong>
                <p>
                  If an account exists for that address, a password reset link
                  has been sent.
                </p>
                <button
                  className="login-secondary"
                  type="button"
                  onClick={() => {
                    setView("login");
                    setFormError("");
                  }}
                >
                  Back to sign in
                </button>
              </div>
            ) : view === "reset" ? (
              resetToken ? (
                <form className="login-form" onSubmit={resetPassword}>
                  <p className="login-explanation">
                    Choose a new password for your account.
                  </p>
                  {formError && (
                    <p className="login-alert" role="alert">
                      {formError}
                    </p>
                  )}
                  <label htmlFor="new-password">New password</label>
                  <PasswordInput
                    id="new-password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <label htmlFor="confirm-password">Confirm new password</label>
                  <PasswordInput
                    id="confirm-password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    className="login-button"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? "Saving…" : "Reset password"}{" "}
                    <span aria-hidden="true">→</span>
                  </button>
                </form>
              ) : (
                <div className="login-message" role="alert">
                  <strong>This reset link is missing its token.</strong>
                  <p>Request a new password reset link and try again.</p>
                  <a className="login-secondary" href="/login/">
                    Back to sign in
                  </a>
                </div>
              )
            ) : view === "reset-complete" ? (
              <div className="login-message" role="status">
                <strong>Password updated</strong>
                <p>
                  Your password has been reset. Sign in with your new password.
                </p>
                <a className="login-button" href="/login/">
                  Back to sign in <span aria-hidden="true">→</span>
                </a>
              </div>
            ) : status === "inactive" ? (
              <div className="login-message" role="status">
                <strong>Your account is awaiting activation.</strong>
                <p>
                  Contact your administrator to request access to the scheduling
                  workspace.
                </p>
                <button className="login-secondary" onClick={signOut}>
                  Sign out
                </button>
              </div>
            ) : status === "signed-in" ? (
              <div className="login-message" role="status">
                <strong>You’re signed in.</strong>
                <p>Continue to your scheduling workspace.</p>
                <a className="login-button" href="/">
                  Continue to workspace <span aria-hidden="true">→</span>
                </a>
                 <button className="login-secondary" onClick={signOut}>
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <p className="login-explanation">
                  Use your Wedgewood account to securely access your workspace.
                </p>
                {status === "unavailable" && (
                  <p className="login-alert" role="alert">
                    We couldn’t check your account. You can still try signing
                    in.
                  </p>
                )}
                {status === "logout-error" && (
                  <p className="login-alert" role="alert">
                    We couldn’t sign you out. Please try again.
                  </p>
                )}
                {formError && (
                  <p className="login-alert" role="alert">
                    {formError}
                  </p>
                )}
                <form className="login-form" onSubmit={signIn}>
                  <label htmlFor="login-email">Email address</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <label htmlFor="login-password">Password</label>
                  <PasswordInput
                    id="login-password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    className="login-button"
                    type="submit"
                    disabled={
                      status === "signing-in" || status === "signing-out"
                    }
                  >
                    {status === "signing-in" ? "Signing in…" : "Sign in"}{" "}
                    <span aria-hidden="true">→</span>
                  </button>
                </form>
                <button
                  className="login-secondary"
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    setFormError("");
                    setPassword("");
                  }}
                >
                  Forgot password?
                </button>
                <p className="login-help">
                  Don’t have an account? <a href="/signup/">Create one</a>
                </p>
                {status === "logout-error" && (
                  <button className="login-secondary" onClick={signOut}>
                    Try signing out again
                  </button>
                )}
              </>
            )}
          </div>
          <p className="login-help">
            Need help signing in? <strong>Contact your administrator.</strong>
          </p>
        </div>
        <footer className="login-footer">
          <span>© Wedgewood Weddings</span>
          <span>Made for the moments that matter.</span>
        </footer>
      </section>
      <aside
        className="login-aside"
        aria-label="About the scheduling workspace"
      >
        <div className="aside-top">
          <span>WEDGEWOOD WEDDINGS</span>
          <span>TEAM SCHEDULING</span>
        </div>
        <div className="aside-content">
          <div className="aside-label">
            <span /> THE WORK BEHIND THE CELEBRATION
          </div>
          <h2>
            Great days begin
            <br />
            <em>with great plans.</em>
          </h2>
          <p>
            From the first detail to the final celebration, it all starts with a
            team that’s ready.
          </p>
          <div className="schedule-illustration" aria-hidden="true">
            <div className="illustration-heading">
              <span>THE WEEK AHEAD</span>
              <span>•••</span>
            </div>
            <div className="illustration-row">
              <span>MON</span>
              <i className="bar bar-one" />
              <i className="bar bar-two" />
            </div>
            <div className="illustration-row">
              <span>TUE</span>
              <i className="bar bar-three" />
            </div>
            <div className="illustration-row">
              <span>WED</span>
              <i className="bar bar-four" />
              <i className="bar bar-five" />
            </div>
            <div className="illustration-row">
              <span>THU</span>
              <i className="bar bar-six" />
            </div>
            <div className="illustration-row">
              <span>FRI</span>
              <i className="bar bar-seven" />
              <i className="bar bar-eight" />
            </div>
          </div>
        </div>
        <div className="aside-bottom">
          <span>THOUGHTFULLY PLANNED</span>
          <span>01 / 01</span>
        </div>
      </aside>
    </main>
  );
}
