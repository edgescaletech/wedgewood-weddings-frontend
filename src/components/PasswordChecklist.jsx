import React from "react";
import { passwordChecks, strengthTip } from "./password-policy.js";

export default function PasswordChecklist({ id, password, confirmation, strength }) {
  const checks = passwordChecks(password);
  checks.push({ label: "Hard to guess", met: strength.score === 4 });
  checks.push({ label: "Passwords match", met: Boolean(password) && password === confirmation });
  return (
    <div className="password-checklist" id={id}>
      <h3>Password requirements</h3>
      <ul>
        {checks.map(({ label, met }) => (
          <li key={label} data-met={met}>
            <span role="img" aria-label={met ? "Requirement satisfied" : "Requirement pending"}>{met ? "✓" : "○"}</span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
      {strength.error ? <p>{strength.error}</p> : password && strength.score < 4 && (
        <p>{strength.warning && `${strength.warning} `}{strengthTip}</p>
      )}
    </div>
  );
}
