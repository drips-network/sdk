export function calculateRandomSalt(): bigint {
  const randomBytes = new Uint8Array(8); // Only 64 bits
  globalThis.crypto.getRandomValues(randomBytes);

  let salt = 0n;
  for (let i = 0; i < 8; i++) {
    salt |= BigInt(randomBytes[i]) << BigInt(i * 8); // Little-endian
  }

  return salt;
}
