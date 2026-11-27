import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config.js";

const browsers = [
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera\//, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const devices = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/CrOS/, "ChromeOS"],
  [/Macintosh|Mac OS X/, "macOS"],
  [/Linux/, "Linux"],
];

function deviceLabel(agent = "") {
  const browser = browsers.find(([pattern]) => pattern.test(agent))?.[1];
  const device = devices.find(([pattern]) => pattern.test(agent))?.[1];
  return [browser, device].filter(Boolean).join(" on ");
}

function sessionLabel(session) {
  if (session.current) {
    return deviceLabel(session.userAgent) || deviceLabel(navigator.userAgent) || "Current browser";
  }
  return deviceLabel(session.userAgent) || "Other session";
}

const sessionDate = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function ProfileSessions() {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSessions() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/sessions`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          window.location.replace("/login");
          return;
        }
        if (!response.ok) throw new Error("Sessions unavailable");
        const sessions = await response.json();
        if (!controller.signal.aborted) {
          sessions.sort((first, second) =>
            Number(second.current) - Number(first.current) ||
            Date.parse(second.createdAt) - Date.parse(first.createdAt),
          );
          setResult({ sessions });
        }
      } catch {
        if (!controller.signal.aborted) setResult({ error: true });
      }
    }

    loadSessions();
    return () => controller.abort();
  }, [attempt]);

  return (
    <section className="profile-card profile-sessions" aria-labelledby="profile-sessions-heading">
      <h2 id="profile-sessions-heading">Active sessions</h2>
      {!result ? (
        <p className="profile-venue-status" role="status">Loading your sessions…</p>
      ) : result.error ? (
        <div className="profile-venue-status" role="alert">
          <p>Couldn’t load your sessions.</p>
          <button className="profile-retry" type="button" onClick={() => {
            setResult(null);
            setAttempt(current => current + 1);
          }}>
            Try again
          </button>
        </div>
      ) : result.sessions.length === 0 ? (
        <p className="profile-venue-status">No active sessions found.</p>
      ) : (
        <ul className="profile-session-list">
          {result.sessions.map(session => (
            <li key={session.id}>
              <div>
                <strong>{sessionLabel(session)}</strong>
                {Number.isFinite(Date.parse(session.createdAt)) && (
                  <p>Signed in <time dateTime={session.createdAt}>{sessionDate.format(new Date(session.createdAt))}</time></p>
                )}
              </div>
              {session.current && <span className="profile-current-session">This session</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
