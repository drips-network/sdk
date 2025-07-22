import {Address, generatePrivateKey, privateKeyToAccount} from 'viem/accounts';

export function generateRandomAddress(): Address {
  return privateKeyToAccount(generatePrivateKey()).address;
}

export function generateRandomBigInt(): bigint {
  return BigInt(Math.floor(Math.random() * 4294967295)); // Random bigint in range [0, 2^32 - 1]
}
