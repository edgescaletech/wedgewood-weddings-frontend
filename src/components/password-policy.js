const configuredMinimum = Number(import.meta.env?.VITE_WORKOS_PASSWORD_MIN_LENGTH);
export const minimumLength = Number.isInteger(configuredMinimum) && configuredMinimum <= 256
  ? Math.max(10, configuredMinimum)
  : 10;

export function passwordChecks(password, minimum = minimumLength) {
  return [
    { label: `At least ${minimum} characters`, met: Array.from(password).length >= minimum },
    { label: "An uppercase letter", met: /[A-Z]/.test(password) },
    { label: "A lowercase letter", met: /[a-z]/.test(password) },
    { label: "A number", met: /[0-9]/.test(password) },
    { label: "A special character", met: /[!-\/:-@\[-`{-~]/.test(password) },
  ];
}

export const strengthTip = "Try a longer password with several unrelated words.";

export function validatePasswords(password, confirmation, strength, minimum = minimumLength) {
  if (!password) return "Enter a password.";
  if (password !== confirmation) return "Passwords do not match.";
  const missing = passwordChecks(password, minimum).find(check => !check.met);
  if (missing) return `Password requirement: ${missing.label.toLowerCase()}.`;
  if (strength.error) return strength.error;
  return strength.score === 4 ? "" : strengthTip;
}
