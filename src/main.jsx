import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { API_BASE_URL as apiBase } from "./config.js";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Staffing, { styles as staffingStyles } from "./pages/staffing.jsx";
import Goals, { styles as goalsStyles } from "./pages/goals.jsx";
import UsersAccess from "./admin/UsersAccess.jsx";
import Login from "./pages/login.jsx";
import "../style.css";

const pages = {
  users: [UsersAccess, ""],
  staffing: [Staffing, staffingStyles],
  goals: [Goals, goalsStyles],
  login: [Login, ""],
};

function getPage() {
  const path = window.location.pathname;
  if (["/admin/users", "/admin/users/", "/admin/users.html"].includes(path)) return "users";
  if (
    [
      "/login",
      "/login/",
      "/login/index.html",
      "/reset-password",
      "/reset-password/",
      "/reset-password/index.html",
    ].includes(path)
  ) {
    return "login";
  }
  if (["/goals", "/goals/", "/goals.html"].includes(path)) {
    if (path !== "/goals") {
      history.replaceState(
        history.state,
        "",
        `/goals${location.search}${location.hash}`,
      );
    }
    return "goals";
  }
  // Default route: go directly to staffing schedule matching client prototype
  if (path !== "/staffing") {
    history.replaceState(
      history.state,
      "",
      `/staffing${location.search}${location.hash}`,
    );
  }
  return "staffing";
}

const page = getPage();

// Check the server session before rendering application components.
function ProtectedPage() {
  const [status, setStatus] = useState("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function checkSession() {
      try {
        const response = await fetch(`${apiBase}/auth/me`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          window.location.replace("/login");
          return;
        }
        setStatus(response.ok ? "authenticated" : "unavailable");
      } catch (error) {
        if (error.name !== "AbortError") setStatus("unavailable");
      }
    }

    checkSession();
    return () => controller.abort();
  }, [attempt]);

  if (status === "authenticated") return <Page />;
  if (status === "unavailable") {
    return (
      <main role="alert" style={{ padding: "24px", textAlign: "center" }}>
        Unable to check your session.{" "}
        <button
          onClick={() => {
            setStatus("checking");
            setAttempt(attempt + 1);
          }}
        >
          Try again
        </button>
      </main>
    );
  }
  return (
    <main role="status" style={{ padding: "24px", textAlign: "center" }}>
      Checking your session…
    </main>
  );
}

function Page() {
  const [Content, css] = pages[page] || pages["staffing"];

  useEffect(() => {
    const styleNodes = (css ? [css] : []).map((cssText) => {
      const node = document.createElement("style");
      node.dataset.reactPageStyle = page;
      node.textContent = cssText;
      document.head.appendChild(node);
      return node;
    });

    let cancelled = false;
    if (page !== "goals") {
      return () => styleNodes.forEach((node) => node.remove());
    }

    const startController = async () => {
      try {
        if (page === "goals") {
          const controller = await import("./legacy/goals.js");
          if (!cancelled) controller.mount();
        }
      } catch (error) {
        console.error(`Unable to start ${page} page controller`, error);
      }
    };
    startController();

    return () => {
      cancelled = true;
      styleNodes.forEach((node) => node.remove());
    };
  }, [page, css]);

  return (
    <div className={`react-page react-page-${page}`}>
      <Content />
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    {page === "login" ? <Page /> : <ProtectedPage />}
  </AuthProvider>,
);
