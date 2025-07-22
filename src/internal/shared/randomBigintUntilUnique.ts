export function randomBigintUntilUnique(
  existing: bigint[],
  byteLength: number,
): bigint {
  const randomBigint = (): bigint => {
    const bytes = new Uint8Array(byteLength);
    globalThis.crypto.getRandomValues(bytes);

    let result = 0n;
    for (let i = 0; i < byteLength; i++) {
      result |= BigInt(bytes[i]) << BigInt(i * 8); // Little-endian
    }

    return result;
  };

  let result = randomBigint();
  while (existing.includes(result)) {
    result = randomBigint();
  }

  return result;
}
