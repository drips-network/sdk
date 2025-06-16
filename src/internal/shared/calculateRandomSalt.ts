export function calculateRandomSalt(): bigint {
  const randomBytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(randomBytes);

  let result = 0n;
  // Only use first 8 bytes (64 bits) as expected by tests
  for (let i = 0; i < 8; i++) {
    result |= BigInt(randomBytes[i]) << BigInt(i * 8);
  }

  return result;
}
