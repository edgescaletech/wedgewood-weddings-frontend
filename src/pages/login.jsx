import React, { useEffect, useState } from "react";
import "./login.css";

const apiBase =
  window.API_BASE_URL ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : "");

export default function Login() {
  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function checkSession() {
      try {
        const response = await fetch(`${apiBase}/auth/me`, {
          credentials: "include",
          signal: controller.signal,
        });
        setStatus(
          response.ok
            ? "signed-in"
            : response.status === 403
              ? "inactive"
              : response.status === 401
                ? "signed-out"
                : "unavailable",
        );
      } catch (error) {
        if (error.name !== "AbortError") setStatus("unavailable");
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
                <h2>Welcome back</h2>
                <p>Sign in to your scheduling account.</p>
              </div>
              <span className="login-lock" aria-hidden="true">
                ↗
              </span>
            </div>
            <div className="login-card-rule" />
            {status === "inactive" ? (
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
                {/* <button className="login-secondary" onClick={signOut}>
                  Sign out
                </button> */}
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
                  <input
                    id="login-password"
                    type="password"
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
