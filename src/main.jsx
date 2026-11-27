import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Staffing, { styles as staffingStyles } from "./pages/staffing.jsx";
import Goals, { styles as goalsStyles } from "./pages/goals.jsx";
import Profile from "./pages/profile.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import { adminPageForPath } from "./admin/navigation.js";
import Login from "./pages/login.jsx";
import { hasAdminDashboardAccess, hasLaborTargetsAccess } from "./context/identity-permissions.js";
import "../style.css";

const pages = {
  admin: [AdminDashboard, ""],
  staffing: [Staffing, staffingStyles],
  goals: [Goals, goalsStyles],
  profile: [Profile, ""],
  login: [Login, ""],
};

function getPage() {
  const legacyAdminPath = window.location.hash === "#venues" ? "/venues"
    : window.location.hash === "#admin-goals" ? "/admin/labor-targets" : null;
  if (legacyAdminPath) {
    history.replaceState(history.state, "", `${legacyAdminPath}${location.search}`);
  }
  const path = window.location.pathname;
  if (adminPageForPath(path)) return "admin";
  if (["/about", "/about/", "/about/index.html"].includes(path)) return "profile";
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
  const { user, sessionStatus, access, accessError, loading: accessLoading, reloadAccess } = useAuth();
  const canOpenAdminPage = ["laborTargets", "venues"].includes(initialAdminPage)
    ? hasLaborTargetsAccess(access)
    : hasAdminDashboardAccess(access);

  useEffect(() => {
    function revalidateSession() {
      reloadAccess({ background: true });
    }

    function checkRestoredSession(event) {
      if (event.persisted) revalidateSession();
    }

    window.addEventListener("focus", revalidateSession);
    window.addEventListener("pageshow", checkRestoredSession);
    window.addEventListener("popstate", revalidateSession);
    return () => {
      window.removeEventListener("focus", revalidateSession);
      window.removeEventListener("pageshow", checkRestoredSession);
      window.removeEventListener("popstate", revalidateSession);
    };
  }, [reloadAccess]);

  useEffect(() => {
    if (
      isAdminPage &&
      sessionStatus === "authenticated" &&
      !accessLoading &&
      !accessError &&
      !canOpenAdminPage
    ) {
      window.location.replace("/staffing/");
    }
  }, [accessError, accessLoading, canOpenAdminPage, sessionStatus]);

  if (sessionStatus === "authenticated" && isAdminPage) {
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

  if (sessionStatus === "authenticated") return <Page key={user.id} />;
  if (sessionStatus === "redirecting") return null;
  if (sessionStatus === "unavailable") {
    return (
      <main role="alert" style={{ padding: "24px", textAlign: "center" }}>
        Unable to check your session.{" "}
        <button onClick={() => reloadAccess()}>Try again</button>
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
  page === "login" ? <Page /> : (
    <AuthProvider>
      <ProtectedPage />
    </AuthProvider>
  ),
);
