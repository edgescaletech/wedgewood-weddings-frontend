import React, { useId, useState } from "react";
import { API_BASE_URL } from "../config.js";
import "./logout-dialog.css";

export default function LogoutDialog({ dialogRef, onClose }) {
  const [status, setStatus] = useState("idle");
  const titleId = useId();
  const pending = status === "pending";

  async function logOut() {
    if (pending) return;
    setStatus("pending");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok || response.status === 401) {
        window.location.replace("/login");
        return;
      }
    } catch {
      // Leave the confirmation open so the user can retry.
    }
    setStatus("failed");
  }

  return (
    <dialog
      ref={dialogRef}
      className="logout-dialog"
      aria-labelledby={titleId}
      onCancel={event => {
        if (pending) event.preventDefault();
      }}
      onClose={() => {
        setStatus("idle");
        onClose();
      }}
    >
      <h2 id={titleId}>Are you sure you want to log out?</h2>
      {status === "failed" && (
        <p role="alert">Couldn’t log out. Please try again.</p>
      )}
      <div className="logout-dialog-actions">
        <button type="button" autoFocus disabled={pending} onClick={() => dialogRef.current.close()}>
          Cancel
        </button>
        <button type="button" disabled={pending} onClick={logOut}>
          {pending ? "Logging out…" : "Log out"}
        </button>
      </div>
    </dialog>
  );
}
