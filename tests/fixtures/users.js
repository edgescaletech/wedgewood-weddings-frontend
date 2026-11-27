const accountPrefixes = {
  admin: "E2E_ADMIN",
  mixedRole: "E2E_USER",
  inactive: "E2E_INACTIVE",
};
export const accountNames = Object.keys(accountPrefixes);
export function credentialsFor(account) {
  const prefix = accountPrefixes[account];
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  return {
    credentials: email && password ? { email, password } : undefined,
    missingMessage: `Set ${prefix}_EMAIL and ${prefix}_PASSWORD for a dedicated test account.`,
  };
}
