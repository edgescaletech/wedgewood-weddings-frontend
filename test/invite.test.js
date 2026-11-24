import assert from "node:assert/strict";
import zxcvbn from "zxcvbn";
import test from "node:test";
import { generatePassword } from "../src/invite/password.js";
import { passwordChecks, validatePasswords } from "../src/components/password-policy.js";
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
  assert.equal(validatePasswords("short", "short", { score: 4 }, 12), "Password requirement: at least 12 characters.");
  assert.equal(validatePasswords("password-one!", "password-two!"), "Passwords do not match.");
  assert.equal(validatePasswords("Password-one1!", "Password-one1!", { score: 4 }, 12), "");
});

test("invitation requests keep the invited identity under server control", () => {
  const input = {
    email: "override@example.test",
    workosUserId: "override",
    invitationId: "inv_123",
    code: "123456",
    password: "New-strong-password1!",
    confirmation: "New-strong-password1!",
    strength: { score: 4 },
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
    password: "New-strong-password1!",
    confirmation: "typo",
    strength: { score: 4 },
    minimumLength: 12,
  }), { error: "Passwords do not match." });
});


test("reports each missing password requirement independently", () => {
  for (const [index, value] of ["Aa1!", "lowercase123!", "UPPERCASE123!", "LongLetters!", "NoSymbol123 "].entries()) {
    assert.deepEqual(passwordChecks(value).map(check => check.met),
      [0, 1, 2, 3, 4].map(position => position !== index));
    assert.ok(validatePasswords(value, value));
  }
  const generated = generatePassword();
  assert.equal(validatePasswords(generated, generated, zxcvbn(generated)), "");
});

test("a predictable password meeting every character rule still fails the strength check", () => {
  const password = "Password123!";
  assert.ok(passwordChecks(password).every(check => check.met));
  const strength = zxcvbn(password);
  assert.ok(strength.score < 4);
  assert.deepEqual(invitationAction("password", { password, confirmation: password, strength }),
    { error: "Try a longer password with several unrelated words." });
  assert.ok(validatePasswords(password, password, { score: 3 }));
  assert.ok(validatePasswords(password, password, { error: "Loading…" }));
});
