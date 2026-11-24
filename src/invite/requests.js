import { validatePasswords } from "../components/password-policy.js";

export function invitationAction(step, { invitationId, code, password, confirmation, strength, minimumLength }) {
  switch (step) {
    case "details":
      return { path: "/invite/send-code", body: {} };
    case "verify":
      if (!/^[0-9]{6}$/.test(code)) return { error: "Enter the six-digit verification code." };
      return { path: "/invite/verify", body: { code } };
    case "password": {
      const error = validatePasswords(password, confirmation, strength, minimumLength);
      if (error) return { error };
      return {
        path: "/invite/password",
        body: { invitationId, password, confirmPassword: confirmation },
      };
    }
    default:
      return { error: "Reload the invitation and try again." };
  }
}
