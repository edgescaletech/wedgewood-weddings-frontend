import assert from "node:assert/strict";
import test from "node:test";
import { generatePassword, validatePasswords } from "../src/invite/password.js";
import { invitationAction } from "../src/invite/requests.js";


test("generates a password with both cases, numbers, and symbols using Web Crypto", () => {
  let samples = 0;
  const random = {
    getRandomValues(values) {
      samples++;
      return globalThis.crypto.getRandomValues(values);
    },
  };

  const password = generatePassword(0, random);
  assert.equal(password.length, 20);
  assert.match(password, /[a-z]/);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[0-9]/);
  assert.match(password, /[^a-zA-Z0-9]/);
  assert.ok(samples >= password.length);
  assert.equal(generatePassword(24).length, 24);
});

test("checks the configured minimum and matching confirmation before acceptance", () => {
  assert.equal(validatePasswords("", ""), "Enter a password.");
  assert.equal(validatePasswords("short", "short", 12), "Use at least 12 characters.");
  assert.equal(validatePasswords("password-one!", "password-two!"), "Passwords do not match.");
  assert.equal(validatePasswords("password-one!", "password-one!", 12), "");
});

test("invitation requests keep the invited identity under server control", () => {
  const input = {
    email: "override@example.test",
    workosUserId: "override",
    invitationId: "inv_123",
    code: "123456",
    password: "new-strong-password!",
    confirmation: "new-strong-password!",
    minimumLength: 12,
  };
  assert.deepEqual(invitationAction("details", input), { path: "/invite/send-code", body: {} });
  assert.deepEqual(invitationAction("verify", input), {
    path: "/invite/verify",
    body: { code: "123456" },
  });
  assert.deepEqual(invitationAction("password", input), {
    path: "/invite/password",
    body: {
      invitationId: "inv_123",
      password: input.password,
      confirmPassword: input.confirmation,
    },
  });
});

test("invalid OTPs and mismatched passwords stop before making a request", () => {
  assert.deepEqual(invitationAction("verify", { code: "1234" }), {
    error: "Enter the six-digit verification code.",
  });
  assert.deepEqual(invitationAction("password", {
    password: "new-strong-password!",
    confirmation: "typo",
    minimumLength: 12,
  }), { error: "Passwords do not match." });
});
