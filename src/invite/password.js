const groups = [
  "abcdefghijkmnopqrstuvwxyz",
  "ABCDEFGHJKLMNPQRSTUVWXYZ",
  "23456789",
  "!@#$%&*+-_?",
];

// Reject samples outside the largest multiple of the limit to avoid bias.
function randomIndex(limit, random) {
  const sample = new Uint32Array(1);
  const range = 2 ** 32;
  const cutoff = range - (range % limit);
  do {
    random.getRandomValues(sample);
  } while (sample[0] >= cutoff);
  return sample[0] % limit;
}

export function generatePassword(minimumLength = 0, random = globalThis.crypto) {
  const characters = groups.join("");
  const length = Math.max(20, minimumLength);
  const password = groups.map((group) => group[randomIndex(group.length, random)]);
  while (password.length < length) {
    password.push(characters[randomIndex(characters.length, random)]);
  }
  for (let index = password.length - 1; index > 0; index--) {
    const swap = randomIndex(index + 1, random);
    [password[index], password[swap]] = [password[swap], password[index]];
  }
  return password.join("");
}

export function validatePasswords(password, confirmation, minimumLength = 0) {
  if (!password) return "Enter a password.";
  if (password.length < minimumLength)
    return `Use at least ${minimumLength} characters.`;
  if (password !== confirmation) return "Passwords do not match.";
  return "";
}
