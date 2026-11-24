import { useEffect, useMemo, useState } from "react";

export function usePasswordStrength(enabled, password) {
  const [estimate, setEstimate] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    import("zxcvbn").then(
      ({ default: scorer }) => { if (active) setEstimate(() => scorer); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [enabled]);

  return useMemo(() => {
    if (failed) return { error: "Reload the page to check password strength." };
    if (!enabled || !estimate) return { error: "Loading password strength check…" };
    // Bound scoring time on long pasted passwords, as recommended by zxcvbn.
    if (!password) return { score: 0 };
    const { score, feedback } = estimate(password.slice(0, 100));
    return { score, warning: feedback.warning };
  }, [enabled, estimate, failed, password]);
}
