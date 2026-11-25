import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { API_BASE_URL as apiBase } from "./config.js";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Staffing, { styles as staffingStyles } from "./pages/staffing.jsx";
import Goals, { styles as goalsStyles } from "./pages/goals.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import { adminPageForPath } from "./admin/navigation.js";
import Login from "./pages/login.jsx";
import { hasAdminDashboardAccess, hasLaborTargetsAccess } from "./context/identity-permissions.js";
import "../style.css";

const pages = {
  admin: [AdminDashboard, ""],
  staffing: [Staffing, staffingStyles],
  goals: [Goals, goalsStyles],
  login: [Login, ""],
};

function getPage() {
  const path = window.location.pathname;
  if (adminPageForPath(path)) return "admin";
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
const initialAdminPage = adminPageForPath(window.location.pathname);
const isAdminPage = page === "admin";

// Check the server session before rendering application components.
function ProtectedPage() {
  const [status, setStatus] = useState("checking");
  const [attempt, setAttempt] = useState(0);
  const { user, access, accessError, loading: accessLoading, reloadAccess } = useAuth();
  const canOpenAdminPage = initialAdminPage === "laborTargets"
    ? hasLaborTargetsAccess(access)
    : hasAdminDashboardAccess(access);

  useEffect(() => {
    const controller = new AbortController();
    let checking = false;

    async function checkSession() {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(`${apiBase}/auth/me`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          setStatus("redirecting");
          window.location.replace("/login");
          return;
        }
        setStatus(response.ok ? "authenticated" : "unavailable");
      } catch (error) {
        if (error.name !== "AbortError") setStatus("unavailable");
      } finally {
        checking = false;
      }
    }

    function revalidateSession() {
      if (checking) return;
      reloadAccess({ background: true });
      checkSession();
    }

    function checkRestoredSession(event) {
      if (event.persisted) revalidateSession();
    }

    checkSession();
    window.addEventListener("focus", revalidateSession);
    window.addEventListener("pageshow", checkRestoredSession);
    window.addEventListener("popstate", revalidateSession);
    return () => {
      controller.abort();
      window.removeEventListener("focus", revalidateSession);
      window.removeEventListener("pageshow", checkRestoredSession);
      window.removeEventListener("popstate", revalidateSession);
    };
  }, [attempt, reloadAccess]);

  useEffect(() => {
    if (
      isAdminPage &&
      status === "authenticated" &&
      !accessLoading &&
      !accessError &&
      !canOpenAdminPage
    ) {
      window.location.replace("/staffing/");
    }
  }, [accessError, accessLoading, canOpenAdminPage, status]);

  if (status === "authenticated" && isAdminPage) {
    if (accessLoading) {
      return (
        <main role="status" style={{ padding: "24px", textAlign: "center" }}>
          Checking Admin access…
        </main>
      );
    }
    if (accessError || !access) {
      return (
        <main role="alert" style={{ padding: "24px", textAlign: "center" }}>
          Unable to check your Admin access. {" "}
          <button onClick={() => window.location.reload()}>Try again</button>
        </main>
      );
    }
    if (!canOpenAdminPage) {
      return (
        <main role="status" style={{ padding: "24px", textAlign: "center" }}>
          Returning to your work dashboard…
        </main>
      );
    }
  }

  if (status === "authenticated") return <Page key={user?.id} />;
  if (status === "redirecting") return null;
  if (status === "unavailable") {
    return (
      <main role="alert" style={{ padding: "24px", textAlign: "center" }}>
        Unable to check your session.{" "}
        <button
          onClick={() => {
            setStatus("checking");
            reloadAccess();
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
      {isAdminPage ? <AdminDashboard initialPage={initialAdminPage} /> : <Content />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    {page === "login" ? <Page /> : <ProtectedPage />}
  </AuthProvider>,
);
