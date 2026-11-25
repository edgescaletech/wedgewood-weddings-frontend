import assert from "node:assert/strict";
import test from "node:test";
import { clearResetToken, resumeResetToken } from "../src/pages/reset-token.js";

function tab() {
  const values = new Map();
  return { sessionStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  } };
}

test("reload resumes the latest link without extending its recovery window", () => {
  const browser = tab();
  resumeResetToken("first", false, browser, 0);
  assert.equal(resumeResetToken("second", false, browser, 1), "second");
  assert.equal(resumeResetToken("", true, browser, 600000), "second");
  assert.equal(resumeResetToken("", true, browser, 600001), "");
});

test("a fresh visit or completed reset clears the saved link", () => {
  const browser = tab();
  resumeResetToken("first", false, browser);
  assert.equal(resumeResetToken("", false, browser), "");
  assert.equal(resumeResetToken("", true, browser), "");
  resumeResetToken("second", false, browser);
  clearResetToken(browser);
  assert.equal(resumeResetToken("", true, browser), "");
});

test("an email link works when storage is unavailable", () => {
  const browser = { get sessionStorage() { throw new Error("Storage disabled"); } };
  assert.equal(resumeResetToken("token", false, browser), "token");
  assert.equal(resumeResetToken("", true, browser), "");
});
