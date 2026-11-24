import React, { useState } from "react";
import PasswordInput from "./PasswordInput.jsx";
import { minimumLength } from "./password-policy.js";
import { generatePassword } from "../invite/password.js";

export default function NewPasswordField({ id, describedBy, password, busy, maxLength, onChange, onGenerate }) {
  const [copyStatus, setCopyStatus] = useState("");

  function generate() {
    const generated = generatePassword(minimumLength);
    onGenerate(generated);
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

  return (
    <>
      <div className="new-password-heading">
        <label htmlFor={id}>New password</label>
        <button type="button" disabled={busy} onClick={generate}>
          Generate
        </button>
      </div>
      <div className="new-password-field">
        <PasswordInput
          id={id}
          autoComplete="new-password"
          aria-describedby={describedBy}
          required
          maxLength={maxLength}
          value={password}
          onChange={(event) => {
            onChange(event.target.value);
            setCopyStatus("");
          }}
        />
        <button
          className="password-visibility new-copy-password"
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
      {copyStatus && <p className="new-password-hint" role="status">{copyStatus}</p>}
    </>
  );
}
