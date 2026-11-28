import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { hasAdminDashboardAccess, hasLaborTargetsAccess } from "../context/identity-permissions.js";
import "./users-access.css";

export default function AdminHeader({ page, displayName, onNavigate }) {
  const { user, access } = useAuth();
  const globalRoles = access?.global?.roles ?? [];
  const identitySubtitle = globalRoles.includes("Admin")
    ? ["Regional Manager", ...globalRoles].join(" · ")
    : globalRoles.join(", ");
  const links = [
    { id: "venues", href: "/venues", label: "Venues", visible: hasLaborTargetsAccess(access) },
    { id: "users", href: "/admin/users", label: "Users & access", visible: hasAdminDashboardAccess(access) },
    { id: "laborTargets", href: "/admin/labor-targets", label: "Labor efficiency targets", visible: hasLaborTargetsAccess(access) },
  ];

  return (
    <header className="rm-shellbar">
      <a className="rm-brand" href="/staffing/">
        <span className="rm-monogram" aria-hidden="true">W</span>
        <span>Wedgewood <b>Scheduling</b></span>
      </a>
      <nav aria-label="Admin navigation">
        {links.filter(({ visible }) => visible).map(({ id, href, label }) => (
          <a
            key={id}
            className={id === page ? "selected" : undefined}
            aria-current={id === page ? "page" : undefined}
            href={href}
            onClick={(event) => onNavigate(event, id, href)}
          >
            {label}
          </a>
        ))}
      </nav>
      {user && (
        <div className="rm-identity">
          <strong>{displayName || user.email}</strong>
          {identitySubtitle && <span>{identitySubtitle}</span>}
        </div>
      )}
    </header>
  );
}
