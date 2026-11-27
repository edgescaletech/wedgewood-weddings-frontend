import { expect } from "@playwright/test";
export const loginURL = /\/login\/?(?:\?.*)?$/;
export const staffingURL = /\/staffing\/?(?:\?.*)?$/;
export async function expectLogin(page) {
  await expect(page).toHaveURL(loginURL);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "More options" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Users & access" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /goals & budgets/i })).toHaveCount(0);
}
export async function expectStaffing(page) {
  await expect(page).toHaveURL(staffingURL);
  await expect(page.getByRole("button", { name: "More options" })).toBeVisible();
}
