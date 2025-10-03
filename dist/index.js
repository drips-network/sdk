import { DripsError, createEthersWriteAdapter, createEthersReadAdapter } from './chunk-UDRMPPVX.js';
import { isAddress, encodeFunctionData, checksumAddress, toHex, decodeFunctionResult, publicActions, parseUnits, toBytes, pad, stringToHex } from 'viem';
import { gql, GraphQLClient } from 'graphql-request';
import { createVersionedParser } from '@efstajas/versioned-parser';
import z6, { z } from 'zod';
import { PinataSDK } from 'pinata';

// src/internal/shared/unreachable.ts
function unreachable(message) {
  let fullMessage = "Unreachable code reached";
  {
    fullMessage += `: ${message}`;
  }
  throw new DripsError(fullMessage);
}

// src/internal/shared/buildTx.ts
function buildTx(request) {
  const callData = encodeFunctionData(request);
  return {
    ...request.batchedTxOverrides,
    to: request.contract,
    abiFunctionName: request.functionName || unreachable("Missing function name"),
    data: callData,
    value: request.batchedTxOverrides?.value || BigInt(0)
  };
}
var AMT_PER_SEC_MULTIPLIER = 1e9;
var AMT_PER_SEC_EXTRA_DECIMALS = 9;
var CYCLE_SECS = 604800;
var TimeUnit = /* @__PURE__ */ ((TimeUnit3) => {
  TimeUnit3[TimeUnit3["SECOND"] = 1] = "SECOND";
  TimeUnit3[TimeUnit3["MINUTE"] = 60] = "MINUTE";
  TimeUnit3[TimeUnit3["HOUR"] = 3600] = "HOUR";
  TimeUnit3[TimeUnit3["DAY"] = 86400] = "DAY";
  TimeUnit3[TimeUnit3["WEEK"] = 604800] = "WEEK";
  TimeUnit3[TimeUnit3["MONTH"] = 2592e3] = "MONTH";
  TimeUnit3[TimeUnit3["YEAR"] = 31536e3] = "YEAR";
  return TimeUnit3;
})(TimeUnit || {});
function parseStreamRate(amount, timeUnit, tokenDecimals) {
  const totalDecimals = tokenDecimals + AMT_PER_SEC_EXTRA_DECIMALS;
  const amountWithPrecision = parseUnits(amount, totalDecimals);
  const amountPerSecond = amountWithPrecision / BigInt(timeUnit);
  return amountPerSecond;
}
function validateStreamRate(amountPerSecond) {
  const amountPerCycle = amountPerSecond * BigInt(CYCLE_SECS);
  const weiPerCycle = amountPerCycle / BigInt(AMT_PER_SEC_MULTIPLIER);
  if (weiPerCycle < 1n) {
    throw new DripsError("Stream rate must be higher than 1 wei per week", {
      meta: {
        operation: validateStreamRate.name,
        amountPerSecond: amountPerSecond.toString(),
        weiPerCycle: weiPerCycle.toString()
      }
    });
  }
}
var STREAM_ID_BITS = 32n;
var AMT_PER_SEC_BITS = 160n;
var START_BITS = 32n;
var DURATION_BITS = 32n;
var MAX_STREAM_ID = (1n << STREAM_ID_BITS) - 1n;
var MAX_AMT_PER_SEC = (1n << AMT_PER_SEC_BITS) - 1n;
var MAX_START = (1n << START_BITS) - 1n;
var MAX_DURATION = (1n << DURATION_BITS) - 1n;
function validateStreamConfig(config) {
  const { dripId, amountPerSec, start, duration } = config;
  if (dripId < 0n || dripId > MAX_STREAM_ID)
    throw new Error(`'dripId' must be in [0, ${MAX_STREAM_ID}]`);
  if (amountPerSec <= 0n || amountPerSec > MAX_AMT_PER_SEC)
    throw new Error(`'amtPerSec' must be in (0, ${MAX_AMT_PER_SEC}]`);
  if (start < 0n || start > MAX_START)
    throw new Error(`'start' must be in [0, ${MAX_START}]`);
  if (duration < 0n || duration > MAX_DURATION)
    throw new Error(`'duration' must be in [0, ${MAX_DURATION}]`);
}
function encodeStreamConfig(config) {
  validateStreamConfig(config);
  let packed = BigInt(config.dripId);
  packed = packed << 160n | BigInt(config.amountPerSec);
  packed = packed << 32n | BigInt(config.start);
  packed = packed << 32n | BigInt(config.duration);
  return packed;
}
function decodeStreamConfig(packed) {
  const mask32 = (1n << 32n) - 1n;
  const mask160 = (1n << 160n) - 1n;
  const config = {
    dripId: packed >> 160n + 32n + 32n,
    amountPerSec: packed >> 32n + 32n & mask160,
    start: packed >> 32n & mask32,
    duration: packed & mask32
  };
  validateStreamConfig(config);
  return config;
}

// src/internal/shared/validateAndFormatStreamReceivers.ts
var MAX_STREAMS_RECEIVERS = 100;
function validateAndFormatStreamReceivers(onChainReceivers) {
  validateMaxReceiversCount(onChainReceivers);
  const nonZeroReceivers = validateNonZeroAmtPerSec(onChainReceivers);
  const sortedReceivers = sortStreamReceivers(nonZeroReceivers);
  validateSortedAndDeduplicated(sortedReceivers);
  return sortedReceivers;
}
function validateMaxReceiversCount(receivers) {
  if (receivers.length > MAX_STREAMS_RECEIVERS) {
    throw new DripsError(
      `Too many stream receivers: ${receivers.length}. Maximum is ${MAX_STREAMS_RECEIVERS}`
    );
  }
}
function validateNonZeroAmtPerSec(receivers) {
  const invalid = receivers.filter(
    (r) => decodeStreamConfig(r.config).amountPerSec === 0n
  );
  if (invalid.length > 0) {
    throw new DripsError(
      `Stream receivers with 0 amtPerSec: ${invalid.map((r) => r.accountId.toString()).join(", ")}`
    );
  }
  return receivers;
}
function sortStreamReceivers(receivers) {
  return [...receivers].sort((a, b) => {
    if (a.accountId !== b.accountId) {
      return a.accountId > b.accountId ? 1 : -1;
    }
    return a.config > b.config ? 1 : -1;
  });
}
function validateSortedAndDeduplicated(receivers) {
  for (let i = 1; i < receivers.length; i++) {
    const prev = receivers[i - 1];
    const curr = receivers[i];
    const sameAccount = prev.accountId === curr.accountId;
    const sameConfig = prev.config === curr.config;
    if (sameAccount && sameConfig) {
      throw new DripsError(
        `Duplicate stream receiver: accountId=${curr.accountId.toString()}, config=${curr.config.toString()}`
      );
    }
    const ordered = prev.accountId < curr.accountId || prev.accountId === curr.accountId && prev.config < curr.config;
    if (!ordered) {
      throw new DripsError(
        `Stream receivers not sorted: receiver at index ${i - 1} (${prev.accountId}, ${prev.config}) should come before receiver at index ${i} (${curr.accountId}, ${curr.config})`
      );
    }
  }
}
function resolveAddressFromAddressDriverId(accountId) {
  const MAX_UINT256 = (1n << 256n) - 1n;
  if (accountId < 0n || accountId > MAX_UINT256) {
    throw new DripsError(
      `Invalid accountId: ${accountId} is outside the uint256 range.`,
      {
        meta: {
          operation: resolveAddressFromAddressDriverId.name
        }
      }
    );
  }
  const mid64BitsMask = (1n << 224n) - 1n ^ (1n << 160n) - 1n;
  const middleBits = accountId & mid64BitsMask;
  if (middleBits !== 0n) {
    throw new Error("Invalid AddressDriver ID: bits 160\u2013223 must be zero.");
  }
  const addressBigInt = accountId & (1n << 160n) - 1n;
  const addressHex = `0x${addressBigInt.toString(16).padStart(40, "0")}`;
  return checksumAddress(addressHex);
}

// src/internal/shared/resolveDriverName.ts
function resolveDriverName(accountId) {
  if (accountId < 0n || accountId > 2n ** 256n - 1n) {
    throw new DripsError(
      `Could not get bits: ${accountId} is not a valid positive number within the range of a uint256.`,
      {
        meta: {
          operation: resolveDriverName.name
        }
      }
    );
  }
  const mask = 2n ** 32n - 1n;
  const bits = accountId >> 224n & mask;
  switch (bits) {
    case 0n:
      return "address";
    case 1n:
      return "nft";
    case 2n:
      return "immutableSplits";
    case 3n:
      return "repo";
    case 4n:
      return "repoSubAccount";
    default:
      throw new Error(`Unknown  for ID ${accountId}.`);
  }
}

// src/internal/config/contractsRegistry.ts
var contractsRegistry = {
  1: {
    repoDriver: {
      address: "0x770023d55D09A9C110694827F1a6B32D5c2b373E"
    },
    nftDriver: {
      address: "0xcf9c49B0962EDb01Cdaa5326299ba85D72405258"
    },
    addressDriver: {
      address: "0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610"
    },
    drips: {
      address: "0xd0Dd053392db676D57317CD4fe96Fc2cCf42D0b4"
    },
    caller: {
      address: "0x60F25ac5F289Dc7F640f948521d486C964A248e5"
    },
    nativeTokenUnwrapper: {
      address: void 0
    }
  },
  80002: {
    repoDriver: {
      address: "0x54372850Db72915Fd9C5EC745683EB607b4a8642"
    },
    nftDriver: {
      address: "0xDafd9Ab96E62941808caa115D184D30A200FA777"
    },
    addressDriver: {
      address: "0x004310a6d47893Dd6e443cbE471c24aDA1e6c619"
    },
    drips: {
      address: "0xeebCd570e50fa31bcf6eF10f989429C87C3A6981"
    },
    caller: {
      address: "0x5C7c5AA20b15e13229771CB7De36Fe1F54238372"
    },
    nativeTokenUnwrapper: {
      address: void 0
    }
  },
  11155420: {
    repoDriver: {
      address: "0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B"
    },
    nftDriver: {
      address: "0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44"
    },
    addressDriver: {
      address: "0x70E1E1437AeFe8024B6780C94490662b45C3B567"
    },
    drips: {
      address: "0x74A32a38D945b9527524900429b083547DeB9bF4"
    },
    caller: {
      address: "0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee"
    },
    nativeTokenUnwrapper: {
      address: void 0
    }
  },
  11155111: {
    repoDriver: {
      address: "0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B"
    },
    nftDriver: {
      address: "0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44"
    },
    addressDriver: {
      address: "0x70E1E1437AeFe8024B6780C94490662b45C3B567"
    },
    drips: {
      address: "0x74A32a38D945b9527524900429b083547DeB9bF4"
    },
    caller: {
      address: "0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee"
    },
    nativeTokenUnwrapper: {
      address: void 0
    }
  },
  31337: {
    repoDriver: {
      address: "0x971e08fc533d2A5f228c7944E511611dA3B56B24"
    },
    nftDriver: {
      address: "0xf98e07d281Ff9b83612DBeF0A067d710716720eA"
    },
    addressDriver: {
      address: "0x1707De7b41A3915F990A663d27AD3a952D50151d"
    },
    drips: {
      address: "0x7CBbD3FdF9E5eb359E6D9B12848c5Faa81629944"
    },
    caller: {
      address: "0x2eac4218a453B1A52544Be315d2376B9A76614F1"
    },
    nativeTokenUnwrapper: {
      address: void 0
    }
  },
  84532: {
    repoDriver: {
      address: "0x54372850Db72915Fd9C5EC745683EB607b4a8642"
    },
    nftDriver: {
      address: "0xDafd9Ab96E62941808caa115D184D30A200FA777"
    },
    addressDriver: {
      address: "0x004310a6d47893Dd6e443cbE471c24aDA1e6c619"
    },
    drips: {
      address: "0xeebCd570e50fa31bcf6eF10f989429C87C3A6981"
    },
    caller: {
      address: "0x5C7c5AA20b15e13229771CB7De36Fe1F54238372"
    },
    nativeTokenUnwrapper: {
      address: void 0
    }
  },
  314: {
    repoDriver: {
      address: "0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257"
    },
    nftDriver: {
      address: "0x2F23217A87cAf04ae586eed7a3d689f6C48498dB"
    },
    addressDriver: {
      address: "0x04693D13826a37dDdF973Be4275546Ad978cb9EE"
    },
    drips: {
      address: "0xd320F59F109c618b19707ea5C5F068020eA333B3"
    },
    caller: {
      address: "0xd6Ab8e72dE3742d45AdF108fAa112Cd232718828"
    },
    nativeTokenUnwrapper: {
      address: "0x64e0d60C70e9778C2E649FfBc90259C86a6Bf396"
    }
  },
  1088: {
    repoDriver: {
      address: "0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257"
    },
    nftDriver: {
      address: "0x2F23217A87cAf04ae586eed7a3d689f6C48498dB"
    },
    addressDriver: {
      address: "0x04693D13826a37dDdF973Be4275546Ad978cb9EE"
    },
    drips: {
      address: "0xd320F59F109c618b19707ea5C5F068020eA333B3"
    },
    caller: {
      address: "0xd6Ab8e72dE3742d45AdF108fAa112Cd232718828"
    },
    nativeTokenUnwrapper: {
      address: void 0
    }
  },
  10: {
    repoDriver: {
      address: "0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257"
    },
    nftDriver: {
      address: "0x2F23217A87cAf04ae586eed7a3d689f6C48498dB"
    },
    addressDriver: {
      address: "0x04693D13826a37dDdF973Be4275546Ad978cb9EE"
    },
    drips: {
      address: "0xd320F59F109c618b19707ea5C5F068020eA333B3"
    },
    caller: {
      address: "0xd6Ab8e72dE3742d45AdF108fAa112Cd232718828"
    },
    nativeTokenUnwrapper: {
      address: "0x64e0d60C70e9778C2E649FfBc90259C86a6Bf396"
    }
  }
};

// src/internal/config/graphqlChainMap.ts
var graphqlChainMap = {
  1: "MAINNET",
  11155111: "SEPOLIA",
  11155420: "OPTIMISM_SEPOLIA",
  80002: "POLYGON_AMOY",
  84532: "BASE_SEPOLIA",
  314: "FILECOIN",
  1088: "METIS",
  31337: "LOCALTESTNET",
  10: "OPTIMISM"
};

// src/internal/shared/assertions.ts
function requireWalletHasAccount(client, operation = "requireWalletHasAccount") {
  if (!client.account) {
    throw new DripsError("WalletClient must have an account configured", {
      meta: {
        operation,
        client
      }
    });
  }
}
function requireSupportedChain(chainId, operation = "requireSupportedChain") {
  if (!(chainId in contractsRegistry)) {
    throw new DripsError(`Unsupported chain ID: ${chainId}`, {
      meta: {
        operation,
        chainId,
        knownChains: Object.keys(contractsRegistry).map(Number)
      }
    });
  }
}
function requireGraphQLSupportedChain(chainId, operation = "requireGraphQLSupportedChain") {
  requireSupportedChain(chainId, operation);
  const chain = graphqlChainMap[chainId];
  if (!chain) {
    throw new DripsError(`Unsupported chain ID: ${chainId}`, {
      meta: {
        operation,
        chainId,
        resolvedChain: chain,
        knownChains: Object.values(graphqlChainMap)
      }
    });
  }
}
function isWriteAdapter(adapter) {
  return "sendTx" in adapter && typeof adapter.sendTx === "function";
}
function requireWriteAccess(adapter, operation = "requireWriteAccess") {
  if (!isWriteAdapter(adapter)) {
    throw new DripsError(
      `Operation '${operation}' requires wallet/signer permissions`,
      {
        meta: {
          operation,
          hint: "Instantiate Drips SDK with a WriteBlockchainAdapter"
        }
      }
    );
  }
}
function requireMetadataUploader(ipfsMetadataUploaderFn, operation = "requireMetadataUploader") {
  if (!ipfsMetadataUploaderFn) {
    throw new DripsError(
      `Operation '${operation}' requires IPFS metadata uploader`,
      {
        meta: {
          operation,
          hint: "Instantiate Drips SDK with an IPFS metadata uploader function"
        }
      }
    );
  }
}
function requireSupportedForge(forge, operation = "requireSupportedForge") {
  if (!supportedForges.includes(forge)) {
    throw new DripsError(`Unsupported forge: ${forge}`, {
      meta: {
        operation,
        forge,
        supportedForges
      }
    });
  }
}

// src/internal/abis/repoDriverAbi.ts
var repoDriverAbi = [
  {
    inputs: [
      {
        internalType: "contract Drips",
        name: "drips_",
        type: "address"
      },
      {
        internalType: "address",
        name: "forwarder",
        type: "address"
      },
      {
        internalType: "uint32",
        name: "driverId_",
        type: "uint32"
      },
      {
        internalType: "contract IAutomate",
        name: "gelatoAutomate_",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "previousAdmin",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "newAdmin",
        type: "address"
      }
    ],
    name: "AdminChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "beacon",
        type: "address"
      }
    ],
    name: "BeaconUpgraded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "userFundsUsed",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "commonFundsUsed",
        type: "uint256"
      }
    ],
    name: "GelatoFeePaid",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract GelatoTasksOwner",
        name: "gelatoTasksOwner",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "taskId",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "string",
        name: "ipfsCid",
        type: "string"
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "maxRequestsPerBlock",
        type: "uint32"
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "maxRequestsPer31Days",
        type: "uint32"
      }
    ],
    name: "GelatoTaskUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "currentAdmin",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newAdmin",
        type: "address"
      }
    ],
    name: "NewAdminProposed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "enum Forge",
        name: "forge",
        type: "uint8"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "name",
        type: "bytes"
      },
      {
        indexed: false,
        internalType: "address",
        name: "payer",
        type: "address"
      }
    ],
    name: "OwnerUpdateRequested",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    name: "OwnerUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "Paused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address"
      }
    ],
    name: "PauserGranted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address"
      }
    ],
    name: "PauserRevoked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "Unpaused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "implementation",
        type: "address"
      }
    ],
    name: "Upgraded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "UserFundsDeposited",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "address payable",
        name: "receiver",
        type: "address"
      }
    ],
    name: "UserFundsWithdrawn",
    type: "event"
  },
  {
    inputs: [],
    name: "acceptAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "admin",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "allPausers",
    outputs: [
      {
        internalType: "address[]",
        name: "pausersList",
        type: "address[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "enum Forge",
        name: "forge",
        type: "uint8"
      },
      {
        internalType: "bytes",
        name: "name",
        type: "bytes"
      }
    ],
    name: "calcAccountId",
    outputs: [
      {
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        internalType: "address",
        name: "transferTo",
        type: "address"
      }
    ],
    name: "collect",
    outputs: [
      {
        internalType: "uint128",
        name: "amt",
        type: "uint128"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "commonFunds",
    outputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address"
      }
    ],
    name: "depositUserFunds",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [],
    name: "drips",
    outputs: [
      {
        internalType: "contract Drips",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "driverId",
    outputs: [
      {
        internalType: "uint32",
        name: "",
        type: "uint32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        components: [
          {
            internalType: "bytes32",
            name: "key",
            type: "bytes32"
          },
          {
            internalType: "bytes",
            name: "value",
            type: "bytes"
          }
        ],
        internalType: "struct AccountMetadata[]",
        name: "accountMetadata",
        type: "tuple[]"
      }
    ],
    name: "emitAccountMetadata",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "gelatoAutomate",
    outputs: [
      {
        internalType: "contract IAutomate",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "gelatoTasksOwner",
    outputs: [
      {
        internalType: "contract GelatoTasksOwner",
        name: "tasksOwner",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "receiver",
        type: "uint256"
      },
      {
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        internalType: "uint128",
        name: "amt",
        type: "uint128"
      }
    ],
    name: "give",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "grantPauser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "implementation",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "isPaused",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "isPauser",
    outputs: [
      {
        internalType: "bool",
        name: "isAddrPauser",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "forwarder",
        type: "address"
      }
    ],
    name: "isTrustedForwarder",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      }
    ],
    name: "ownerOf",
    outputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newAdmin",
        type: "address"
      }
    ],
    name: "proposeNewAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "proposedAdmin",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "proxiableUUID",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "enum Forge",
        name: "forge",
        type: "uint8"
      },
      {
        internalType: "bytes",
        name: "name",
        type: "bytes"
      }
    ],
    name: "requestUpdateOwner",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "requestUpdateOwnerGasPenalty",
    outputs: [
      {
        internalType: "uint256",
        name: "gasPenalty",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "revokePauser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "accountId",
            type: "uint256"
          },
          {
            internalType: "uint32",
            name: "weight",
            type: "uint32"
          }
        ],
        internalType: "struct SplitsReceiver[]",
        name: "receivers",
        type: "tuple[]"
      }
    ],
    name: "setSplits",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "accountId",
            type: "uint256"
          },
          {
            internalType: "StreamConfig",
            name: "config",
            type: "uint256"
          }
        ],
        internalType: "struct StreamReceiver[]",
        name: "currReceivers",
        type: "tuple[]"
      },
      {
        internalType: "int128",
        name: "balanceDelta",
        type: "int128"
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "accountId",
            type: "uint256"
          },
          {
            internalType: "StreamConfig",
            name: "config",
            type: "uint256"
          }
        ],
        internalType: "struct StreamReceiver[]",
        name: "newReceivers",
        type: "tuple[]"
      },
      {
        internalType: "uint32",
        name: "maxEndHint1",
        type: "uint32"
      },
      {
        internalType: "uint32",
        name: "maxEndHint2",
        type: "uint32"
      },
      {
        internalType: "address",
        name: "transferTo",
        type: "address"
      }
    ],
    name: "setStreams",
    outputs: [
      {
        internalType: "int128",
        name: "realBalanceDelta",
        type: "int128"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "ipfsCid",
        type: "string"
      },
      {
        internalType: "uint32",
        name: "maxRequestsPerBlock",
        type: "uint32"
      },
      {
        internalType: "uint32",
        name: "maxRequestsPer31Days",
        type: "uint32"
      }
    ],
    name: "updateGelatoTask",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        internalType: "address",
        name: "payer",
        type: "address"
      }
    ],
    name: "updateOwnerByGelato",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address"
      }
    ],
    name: "upgradeTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address"
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes"
      }
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address"
      }
    ],
    name: "userFunds",
    outputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "address payable",
        name: "receiver",
        type: "address"
      }
    ],
    name: "withdrawUserFunds",
    outputs: [
      {
        internalType: "uint256",
        name: "withdrawnAmount",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    stateMutability: "payable",
    type: "receive"
  }
];

// src/internal/projects/calcProjectId.ts
var supportedForges = ["github", "orcid"];
var forgeMap = {
  github: 0,
  orcid: 2
};
async function calcOrcidAccountId(adapter, orcidId) {
  return calcRepoDriverAccountId(adapter, { forge: "orcid", name: orcidId });
}
async function calcProjectId(adapter, params) {
  return calcRepoDriverAccountId(adapter, params);
}
async function calcRepoDriverAccountId(adapter, params) {
  const chainId = await adapter.getChainId();
  const { forge, name } = params;
  requireSupportedChain(chainId);
  const contract = contractsRegistry[chainId].repoDriver.address;
  const calcAccountIdTx = buildTx({
    abi: repoDriverAbi,
    contract,
    functionName: "calcAccountId",
    args: [forgeMap[forge], toHex(name)]
  });
  const encodedResult = await adapter.call(calcAccountIdTx);
  const accountId = decodeFunctionResult({
    abi: repoDriverAbi,
    functionName: "calcAccountId",
    data: encodedResult
  });
  return accountId;
}

// src/internal/projects/destructProjectUrl.ts
function destructProjectUrl(url) {
  const pattern = /^(?:https?:\/\/)?(?:www\.)?(github|gitlab)\.com\/([^\/]+)\/([^\/]+)/;
  const match = url.match(pattern);
  if (!match) {
    throw new Error(`Unsupported repository url: ${url}.`);
  }
  const forge = match[1];
  requireSupportedForge(forge);
  const ownerName = match[2];
  const repoName = match[3];
  return {
    forge: "github",
    ownerName,
    repoName
  };
}

// src/internal/abis/addressDriverAbi.ts
var addressDriverAbi = [
  {
    inputs: [
      { internalType: "contract Drips", name: "drips_", type: "address" },
      { internalType: "address", name: "forwarder", type: "address" },
      { internalType: "uint32", name: "driverId_", type: "uint32" }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "previousAdmin",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "newAdmin",
        type: "address"
      }
    ],
    name: "AdminChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "beacon",
        type: "address"
      }
    ],
    name: "BeaconUpgraded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "currentAdmin",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newAdmin",
        type: "address"
      }
    ],
    name: "NewAdminProposed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "Paused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address"
      }
    ],
    name: "PauserGranted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address"
      }
    ],
    name: "PauserRevoked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "Unpaused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "implementation",
        type: "address"
      }
    ],
    name: "Upgraded",
    type: "event"
  },
  {
    inputs: [],
    name: "acceptAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "allPausers",
    outputs: [
      {
        internalType: "address[]",
        name: "pausersList",
        type: "address[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "addr", type: "address" }],
    name: "calcAccountId",
    outputs: [{ internalType: "uint256", name: "accountId", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      { internalType: "address", name: "transferTo", type: "address" }
    ],
    name: "collect",
    outputs: [{ internalType: "uint128", name: "amt", type: "uint128" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "drips",
    outputs: [{ internalType: "contract Drips", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "driverId",
    outputs: [{ internalType: "uint32", name: "", type: "uint32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          { internalType: "bytes32", name: "key", type: "bytes32" },
          { internalType: "bytes", name: "value", type: "bytes" }
        ],
        internalType: "struct AccountMetadata[]",
        name: "accountMetadata",
        type: "tuple[]"
      }
    ],
    name: "emitAccountMetadata",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "receiver", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      { internalType: "uint128", name: "amt", type: "uint128" }
    ],
    name: "give",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "pauser", type: "address" }],
    name: "grantPauser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "implementation",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "isPaused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "pauser", type: "address" }],
    name: "isPauser",
    outputs: [{ internalType: "bool", name: "isAddrPauser", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "forwarder", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "newAdmin", type: "address" }],
    name: "proposeNewAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "proposedAdmin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "proxiableUUID",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "pauser", type: "address" }],
    name: "revokePauser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          { internalType: "uint32", name: "weight", type: "uint32" }
        ],
        internalType: "struct SplitsReceiver[]",
        name: "receivers",
        type: "tuple[]"
      }
    ],
    name: "setSplits",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          {
            internalType: "StreamConfig",
            name: "config",
            type: "uint256"
          }
        ],
        internalType: "struct StreamReceiver[]",
        name: "currReceivers",
        type: "tuple[]"
      },
      { internalType: "int128", name: "balanceDelta", type: "int128" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          {
            internalType: "StreamConfig",
            name: "config",
            type: "uint256"
          }
        ],
        internalType: "struct StreamReceiver[]",
        name: "newReceivers",
        type: "tuple[]"
      },
      { internalType: "uint32", name: "maxEndHint1", type: "uint32" },
      { internalType: "uint32", name: "maxEndHint2", type: "uint32" },
      { internalType: "address", name: "transferTo", type: "address" }
    ],
    name: "setStreams",
    outputs: [
      { internalType: "int128", name: "realBalanceDelta", type: "int128" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address"
      }
    ],
    name: "upgradeTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address"
      },
      { internalType: "bytes", name: "data", type: "bytes" }
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  }
];

// src/internal/shared/calcAddressId.ts
async function calcAddressId(adapter, address) {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  const contract = contractsRegistry[chainId].addressDriver.address;
  const calcAccountIdTx = buildTx({
    abi: addressDriverAbi,
    contract,
    functionName: "calcAccountId",
    args: [address]
  });
  const encodedResult = await adapter.call(calcAccountIdTx);
  const accountId = decodeFunctionResult({
    abi: addressDriverAbi,
    functionName: "calcAccountId",
    data: encodedResult
  });
  return accountId;
}

// src/internal/shared/accountIdUtils.ts
var ORCID_FORMAT_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
function extractOrcidIdFromAccountId(accountId) {
  const accountIdAsBigInt = BigInt(accountId);
  const nameEncoded = accountIdAsBigInt & (1n << 216n) - 1n;
  const nameBytes = nameEncoded.toString(16).padStart(54, "0");
  const nameStr = Buffer.from(nameBytes, "hex").toString("utf8").replace(/\0+$/, "");
  if (ORCID_FORMAT_REGEX.test(nameStr)) {
    return nameStr;
  }
  return null;
}

// src/internal/shared/receiverUtils.ts
var MAX_SPLITS_RECEIVERS = 200;
var TOTAL_SPLITS_WEIGHT = 1e6;
async function resolveReceiverAccountId(adapter, receiver) {
  if (receiver.type === "project") {
    if (!receiver.url) {
      throw new DripsError("Project receiver must have a url", {
        meta: {
          operation: resolveReceiverAccountId.name,
          receiver
        }
      });
    }
    const { forge, ownerName, repoName } = destructProjectUrl(receiver.url);
    return await calcProjectId(adapter, {
      forge,
      name: `${ownerName}/${repoName}`
    });
  } else if (receiver.type === "address") {
    if (!receiver.address) {
      throw new DripsError("Address receiver must have an address", {
        meta: {
          operation: resolveReceiverAccountId.name,
          receiver
        }
      });
    }
    return await calcAddressId(adapter, receiver.address);
  } else if (receiver.type === "orcid") {
    if (!receiver.orcidId) {
      throw new DripsError("ORCID receiver must have an ORCID iD", {
        meta: {
          operation: resolveReceiverAccountId.name,
          receiver
        }
      });
    }
    return await calcProjectId(adapter, {
      forge: supportedForges[1],
      name: receiver.orcidId
    });
  } else if (receiver.type === "drip-list" || receiver.type === "sub-list" || receiver.type === "ecosystem-main-account") {
    if (!receiver.accountId) {
      throw new DripsError(`${receiver.type} receiver must have an accountId`, {
        meta: {
          operation: resolveReceiverAccountId.name,
          receiver
        }
      });
    }
    return receiver.accountId;
  }
  throw new DripsError(`Unsupported receiver type: ${receiver.type}`, {
    meta: {
      operation: resolveReceiverAccountId.name,
      receiver
    }
  });
}
function mapApiSplitsToSdkSplitsReceivers(splits) {
  return splits.map((s) => {
    const { weight, account } = s;
    if (account.driver === "REPO") {
      if ("project" in s) {
        const receiver = s;
        if (!receiver.project?.source.url) {
          throw new DripsError("Missing project URL for REPO receiver", {
            meta: { operation: "mapApiSplitsToSdkSplitsReceivers", receiver: s }
          });
        }
        return {
          type: "project",
          url: receiver.project.source.url,
          weight
        };
      }
      const orcidId = extractOrcidIdFromAccountId(account.accountId);
      if (!orcidId) {
        throw new DripsError("Failed to extract ORCID iD from account ID", {
          meta: { operation: "mapApiSplitsToSdkSplitsReceivers", receiver: s }
        });
      }
      return {
        type: "orcid",
        orcidId,
        weight
      };
    } else if (account.driver === "NFT") {
      return {
        type: "drip-list",
        accountId: BigInt(account.accountId),
        weight
      };
    } else if (account.driver === "IMMUTABLE_SPLITS") {
      return {
        type: "sub-list",
        accountId: BigInt(account.accountId),
        weight
      };
    } else if (account.driver === "ADDRESS") {
      const receiver = s;
      return {
        type: "address",
        address: receiver.account.address,
        weight
      };
    }
    throw new DripsError(`Unsupported account driver: ${account.driver}`, {
      meta: { operation: mapApiSplitsToSdkSplitsReceivers.name, receiver: s }
    });
  });
}
async function mapSdkToMetadataSplitsReceiver(accountId, receiver) {
  if (receiver.type === "project") {
    const { url, weight } = receiver;
    const { forge, ownerName, repoName } = destructProjectUrl(url);
    return {
      type: "repoDriver",
      weight,
      accountId: accountId.toString(),
      source: {
        forge,
        url,
        ownerName,
        repoName
      }
    };
  } else if (receiver.type === "drip-list") {
    return {
      type: "dripList",
      weight: receiver.weight,
      accountId: accountId.toString()
    };
  } else if (receiver.type === "sub-list") {
    return {
      type: "subList",
      weight: receiver.weight,
      accountId: accountId.toString()
    };
  } else if (receiver.type === "address") {
    return {
      type: "address",
      weight: receiver.weight,
      accountId: accountId.toString()
    };
  } else if (receiver.type === "orcid") {
    return {
      type: "orcid",
      weight: receiver.weight,
      accountId: accountId.toString(),
      orcidId: receiver.orcidId
    };
  }
  throw new DripsError(`Unsupported receiver type: ${receiver.type}`, {
    meta: {
      operation: mapSdkToMetadataSplitsReceiver.name,
      receiver
    }
  });
}
async function parseSplitsReceivers(adapter, sdkReceivers) {
  if (sdkReceivers.length === 0) {
    return { onChain: [], metadata: [] };
  }
  if (sdkReceivers.length > MAX_SPLITS_RECEIVERS) {
    throw new DripsError(
      `Maximum of ${MAX_SPLITS_RECEIVERS} receivers allowed`,
      {
        meta: { operation: parseSplitsReceivers.name }
      }
    );
  }
  const resolved = await Promise.all(
    sdkReceivers.map(async (r) => ({
      receiver: r,
      accountId: await resolveReceiverAccountId(adapter, r)
    }))
  );
  resolved.sort((a, b) => a.accountId > b.accountId ? 1 : -1);
  const onChain = [];
  const metadata = [];
  let totalWeight = 0;
  let prevAccountId = null;
  for (const { receiver, accountId } of resolved) {
    const { weight } = receiver;
    if (weight <= 0 || weight > TOTAL_SPLITS_WEIGHT) {
      throw new DripsError(`Invalid weight: ${weight}`, {
        meta: { operation: parseSplitsReceivers.name, receiver }
      });
    }
    if (prevAccountId !== null && accountId <= prevAccountId) {
      throw new DripsError(
        `Splits receivers not strictly sorted or deduplicated: ${accountId} after ${prevAccountId}`,
        {
          meta: { operation: parseSplitsReceivers.name }
        }
      );
    }
    totalWeight += weight;
    prevAccountId = accountId;
    onChain.push({ accountId, weight });
    metadata.push(await mapSdkToMetadataSplitsReceiver(accountId, receiver));
  }
  if (totalWeight !== TOTAL_SPLITS_WEIGHT) {
    throw new DripsError(
      `Total weight must be exactly ${TOTAL_SPLITS_WEIGHT}, but got ${totalWeight}`,
      {
        meta: { operation: parseSplitsReceivers.name }
      }
    );
  }
  return { onChain, metadata };
}

// src/internal/abis/nftDriverAbi.ts
var nftDriverAbi = [
  {
    inputs: [
      { internalType: "contract Drips", name: "drips_", type: "address" },
      { internalType: "address", name: "forwarder", type: "address" },
      { internalType: "uint32", name: "driverId_", type: "uint32" }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "previousAdmin",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "newAdmin",
        type: "address"
      }
    ],
    name: "AdminChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "approved",
        type: "address"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256"
      }
    ],
    name: "Approval",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool"
      }
    ],
    name: "ApprovalForAll",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "beacon",
        type: "address"
      }
    ],
    name: "BeaconUpgraded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "currentAdmin",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newAdmin",
        type: "address"
      }
    ],
    name: "NewAdminProposed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "Paused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address"
      }
    ],
    name: "PauserGranted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address"
      }
    ],
    name: "PauserRevoked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256"
      }
    ],
    name: "Transfer",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "Unpaused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "implementation",
        type: "address"
      }
    ],
    name: "Upgraded",
    type: "event"
  },
  {
    inputs: [],
    name: "acceptAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "allPausers",
    outputs: [
      {
        internalType: "address[]",
        name: "pausersList",
        type: "address[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "minter", type: "address" },
      { internalType: "uint64", name: "salt", type: "uint64" }
    ],
    name: "calcTokenIdWithSalt",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      { internalType: "address", name: "transferTo", type: "address" }
    ],
    name: "collect",
    outputs: [{ internalType: "uint128", name: "amt", type: "uint128" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "drips",
    outputs: [{ internalType: "contract Drips", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "driverId",
    outputs: [{ internalType: "uint32", name: "", type: "uint32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      {
        components: [
          { internalType: "bytes32", name: "key", type: "bytes32" },
          { internalType: "bytes", name: "value", type: "bytes" }
        ],
        internalType: "struct AccountMetadata[]",
        name: "accountMetadata",
        type: "tuple[]"
      }
    ],
    name: "emitAccountMetadata",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getApproved",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "uint256", name: "receiver", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      { internalType: "uint128", name: "amt", type: "uint128" }
    ],
    name: "give",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "pauser", type: "address" }],
    name: "grantPauser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "implementation",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "operator", type: "address" }
    ],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "isPaused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "pauser", type: "address" }],
    name: "isPauser",
    outputs: [{ internalType: "bool", name: "isAddrPauser", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "minter", type: "address" },
      { internalType: "uint64", name: "salt", type: "uint64" }
    ],
    name: "isSaltUsed",
    outputs: [{ internalType: "bool", name: "isUsed", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "forwarder", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      {
        components: [
          { internalType: "bytes32", name: "key", type: "bytes32" },
          { internalType: "bytes", name: "value", type: "bytes" }
        ],
        internalType: "struct AccountMetadata[]",
        name: "accountMetadata",
        type: "tuple[]"
      }
    ],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint64", name: "salt", type: "uint64" },
      { internalType: "address", name: "to", type: "address" },
      {
        components: [
          { internalType: "bytes32", name: "key", type: "bytes32" },
          { internalType: "bytes", name: "value", type: "bytes" }
        ],
        internalType: "struct AccountMetadata[]",
        name: "accountMetadata",
        type: "tuple[]"
      }
    ],
    name: "mintWithSalt",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [],
    name: "nextTokenId",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "newAdmin", type: "address" }],
    name: "proposeNewAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "proposedAdmin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "proxiableUUID",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "pauser", type: "address" }],
    name: "revokePauser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      {
        components: [
          { internalType: "bytes32", name: "key", type: "bytes32" },
          { internalType: "bytes", name: "value", type: "bytes" }
        ],
        internalType: "struct AccountMetadata[]",
        name: "accountMetadata",
        type: "tuple[]"
      }
    ],
    name: "safeMint",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint64", name: "salt", type: "uint64" },
      { internalType: "address", name: "to", type: "address" },
      {
        components: [
          { internalType: "bytes32", name: "key", type: "bytes32" },
          { internalType: "bytes", name: "value", type: "bytes" }
        ],
        internalType: "struct AccountMetadata[]",
        name: "accountMetadata",
        type: "tuple[]"
      }
    ],
    name: "safeMintWithSalt",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "bytes", name: "data", type: "bytes" }
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" }
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          { internalType: "uint32", name: "weight", type: "uint32" }
        ],
        internalType: "struct SplitsReceiver[]",
        name: "receivers",
        type: "tuple[]"
      }
    ],
    name: "setSplits",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          {
            internalType: "StreamConfig",
            name: "config",
            type: "uint256"
          }
        ],
        internalType: "struct StreamReceiver[]",
        name: "currReceivers",
        type: "tuple[]"
      },
      { internalType: "int128", name: "balanceDelta", type: "int128" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          {
            internalType: "StreamConfig",
            name: "config",
            type: "uint256"
          }
        ],
        internalType: "struct StreamReceiver[]",
        name: "newReceivers",
        type: "tuple[]"
      },
      { internalType: "uint32", name: "maxEndHint1", type: "uint32" },
      { internalType: "uint32", name: "maxEndHint2", type: "uint32" },
      { internalType: "address", name: "transferTo", type: "address" }
    ],
    name: "setStreams",
    outputs: [
      { internalType: "int128", name: "realBalanceDelta", type: "int128" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address"
      }
    ],
    name: "upgradeTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address"
      },
      { internalType: "bytes", name: "data", type: "bytes" }
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  }
];

// src/internal/shared/calcDripListId.ts
async function calcDripListId(adapter, params) {
  const chainId = await adapter.getChainId();
  const { minter, salt } = params;
  requireSupportedChain(chainId);
  const contract = contractsRegistry[chainId].nftDriver.address;
  const calcTokenIdWithSaltTx = buildTx({
    abi: nftDriverAbi,
    contract,
    functionName: "calcTokenIdWithSalt",
    args: [minter, salt]
  });
  const encodedResult = await adapter.call(calcTokenIdWithSaltTx);
  const dripListId = decodeFunctionResult({
    abi: nftDriverAbi,
    functionName: "calcTokenIdWithSalt",
    data: encodedResult
  });
  return dripListId;
}

// src/internal/blockchain/adapters/viem/viemMappers.ts
function mapToViemCallParameters(tx) {
  const baseRequest = {
    to: tx.to,
    data: tx.data,
    value: tx.value !== void 0 ? tx.value : void 0,
    gas: tx.gasLimit !== void 0 ? tx.gasLimit : void 0,
    nonce: tx.nonce
  };
  if (tx.maxFeePerGas !== void 0 || tx.maxPriorityFeePerGas !== void 0) {
    if (tx.gasPrice !== void 0) {
      throw new DripsError(
        "Cannot specify both EIP-1559 and legacy gas parameters.",
        {
          meta: {
            gasPrice: tx.gasPrice,
            maxFeePerGas: tx.maxFeePerGas,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
            operation: mapToViemCallParameters.name
          }
        }
      );
    }
    return {
      ...baseRequest,
      maxFeePerGas: tx.maxFeePerGas !== void 0 ? tx.maxFeePerGas : void 0,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas !== void 0 ? tx.maxPriorityFeePerGas : void 0
    };
  } else if (tx.gasPrice !== void 0) {
    return {
      ...baseRequest,
      gasPrice: tx.gasPrice
    };
  }
  return baseRequest;
}
function mapFromViemResponse(hash, publicClient) {
  return {
    hash,
    wait: async (confirmations = 1) => {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations
      });
      return mapFromViemReceipt(receipt);
    }
  };
}
function mapFromViemReceipt(viemReceipt) {
  const { status, gasUsed, transactionHash, blockNumber, logs, from, to } = viemReceipt;
  return {
    from,
    logs,
    gasUsed,
    blockNumber,
    to: to === null ? void 0 : to,
    hash: transactionHash,
    status
  };
}

// src/internal/blockchain/adapters/viem/createViemMeta.ts
function createViemMeta(tx, context) {
  return {
    to: tx.to,
    funcName: tx.abiFunctionName,
    account: context.account,
    chainId: context.client.chain?.id,
    operation: tx.abiFunctionName ?? context.operationFallback,
    gas: {
      gasLimit: tx.gasLimit,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas
    }
  };
}

// src/internal/blockchain/adapters/viem/viemAdapters.ts
function createViemReadAdapter(publicClient) {
  return {
    async call(tx) {
      const meta = createViemMeta(tx, {
        client: publicClient,
        operationFallback: "call"
      });
      try {
        const callParams = mapToViemCallParameters(tx);
        const result = await publicClient.call(callParams);
        if (!result.data) {
          throw new DripsError("Contract call returned no data", { meta });
        }
        return result.data;
      } catch (error) {
        throw new DripsError("Contract read failed", { cause: error, meta });
      }
    },
    async getChainId() {
      try {
        return publicClient.chain?.id ?? await publicClient.getChainId();
      } catch (error) {
        throw new DripsError("Failed to get chain ID", { cause: error });
      }
    }
  };
}
function createViemWriteAdapter(walletClient) {
  requireWalletHasAccount(walletClient);
  const publicClient = walletClient.extend(publicActions);
  return {
    ...createViemReadAdapter(publicClient),
    async getAddress() {
      return walletClient.account.address;
    },
    async sendTx(tx) {
      const meta = createViemMeta(tx, {
        client: walletClient,
        account: walletClient.account,
        operationFallback: "sendTx"
      });
      try {
        const callParams = mapToViemCallParameters(tx);
        const txHash = await walletClient.sendTransaction({
          ...callParams,
          chain: walletClient.chain,
          account: walletClient.account
        });
        return {
          ...mapFromViemResponse(txHash, publicClient),
          meta
        };
      } catch (error) {
        throw new DripsError(
          `Contract write failed (func: ${tx.abiFunctionName})`,
          {
            cause: error,
            meta
          }
        );
      }
    },
    async signMsg(message) {
      const meta = {
        message,
        chainId: walletClient.chain?.id,
        operation: "signMsg"
      };
      try {
        return await walletClient.signMessage({
          account: walletClient.account,
          message: typeof message === "string" ? message : { raw: message }
        });
      } catch (error) {
        throw new DripsError("Message signing failed", { cause: error, meta });
      }
    }
  };
}

// src/internal/blockchain/resolveBlockchainAdapter.ts
function resolveBlockchainAdapter(client) {
  if ("type" in client && client.type === "custom" && "call" in client && typeof client.call === "function") {
    return client;
  }
  if ("transport" in client && hasRequiredMethods(client, ["sendTransaction"]) && !hasRequiredMethods(client, ["signMessage", "getAddress"])) {
    const walletClient = client;
    requireWalletHasAccount(walletClient);
    return createViemWriteAdapter(walletClient);
  }
  if ("transport" in client && hasRequiredMethods(client, ["call"]) && !("sendTransaction" in client)) {
    return createViemReadAdapter(client);
  }
  if (!("transport" in client) && hasRequiredMethods(client, ["signMessage", "getAddress"])) {
    return createEthersWriteAdapter(client);
  }
  if (!("transport" in client) && hasRequiredMethods(client, ["call"]) && !("signMessage" in client)) {
    return createEthersReadAdapter(client);
  }
  throw new DripsError("Unsupported client type for blockchain adapter", {
    meta: {
      operation: resolveBlockchainAdapter.name,
      clientKeys: Object.keys(client)
    }
  });
}
function hasRequiredMethods(obj, methods) {
  if (!obj) {
    return false;
  }
  return methods.every(
    (method) => method in obj && typeof obj[method] === "function"
  );
}

// src/internal/abis/callerAbi.ts
var callerAbi = [
  { inputs: [], name: "InvalidShortString", type: "error" },
  {
    inputs: [{ internalType: "string", name: "str", type: "string" }],
    name: "StringTooLong",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender", type: "address" },
      {
        indexed: true,
        internalType: "address",
        name: "authorized",
        type: "address"
      }
    ],
    name: "Authorized",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender", type: "address" },
      {
        indexed: true,
        internalType: "address",
        name: "authorized",
        type: "address"
      }
    ],
    name: "CalledAs",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender", type: "address" },
      { indexed: false, internalType: "uint256", name: "nonce", type: "uint256" }
    ],
    name: "CalledSigned",
    type: "event"
  },
  { anonymous: false, inputs: [], name: "EIP712DomainChanged", type: "event" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "newNonce",
        type: "uint256"
      }
    ],
    name: "NonceSet",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender", type: "address" },
      {
        indexed: true,
        internalType: "address",
        name: "unauthorized",
        type: "address"
      }
    ],
    name: "Unauthorized",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender", type: "address" }
    ],
    name: "UnauthorizedAll",
    type: "event"
  },
  {
    inputs: [],
    name: "MAX_NONCE_INCREASE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "sender", type: "address" }],
    name: "allAuthorized",
    outputs: [
      { internalType: "address[]", name: "authorized", type: "address[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "authorize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "target", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" }
    ],
    name: "callAs",
    outputs: [{ internalType: "bytes", name: "returnData", type: "bytes" }],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "target", type: "address" },
          { internalType: "bytes", name: "data", type: "bytes" },
          { internalType: "uint256", name: "value", type: "uint256" }
        ],
        internalType: "struct Call[]",
        name: "calls",
        type: "tuple[]"
      }
    ],
    name: "callBatched",
    outputs: [{ internalType: "bytes[]", name: "returnData", type: "bytes[]" }],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "target", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "sv", type: "bytes32" }
    ],
    name: "callSigned",
    outputs: [{ internalType: "bytes", name: "returnData", type: "bytes" }],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [],
    name: "eip712Domain",
    outputs: [
      { internalType: "bytes1", name: "fields", type: "bytes1" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "version", type: "string" },
      { internalType: "uint256", name: "chainId", type: "uint256" },
      { internalType: "address", name: "verifyingContract", type: "address" },
      { internalType: "bytes32", name: "salt", type: "bytes32" },
      { internalType: "uint256[]", name: "extensions", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "user", type: "address" }
    ],
    name: "isAuthorized",
    outputs: [{ internalType: "bool", name: "authorized", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "forwarder", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "sender", type: "address" }],
    name: "nonce",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "newNonce", type: "uint256" }],
    name: "setNonce",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "unauthorize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "unauthorizeAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

// src/internal/drip-lists/buildDripListMetadata.ts
function buildDripListMetadata(params) {
  const {
    dripListId,
    receivers,
    name,
    description,
    isVisible,
    latestVotingRoundId
  } = params;
  return {
    driver: "nft",
    type: "dripList",
    describes: {
      accountId: dripListId.toString(),
      driver: "nft"
    },
    name,
    description: description ?? void 0,
    isVisible,
    recipients: [...receivers],
    latestVotingRoundId
  };
}

// src/internal/drip-lists/calculateRandomSalt.ts
function calculateRandomSalt() {
  const randomBytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(randomBytes);
  let salt = 0n;
  for (let i = 0; i < 8; i++) {
    salt |= BigInt(randomBytes[i]) << BigInt(i * 8);
  }
  return salt;
}

// src/internal/shared/convertToCallerCall.ts
function convertToCallerCall(tx) {
  return {
    target: tx.to,
    data: tx.data,
    value: BigInt(tx.value || 0)
  };
}
var USER_METADATA_KEY = "ipfs";
function encodeMetadataKeyValue({
  key,
  value
}) {
  const keyBytes = toBytes(key);
  if (keyBytes.length > 31) {
    throw new DripsError(
      `Metadata key "${key}" is too long: ${keyBytes.length} bytes (max 31)`
    );
  }
  const encodedKey = pad(toHex(keyBytes), { size: 32, dir: "right" });
  return {
    key: encodedKey,
    value: stringToHex(value)
  };
}

// src/internal/drip-lists/prepareDripListCreation.ts
async function prepareDripListCreation(adapter, ipfsMetadataUploaderFn, dripList) {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  const {
    name,
    isVisible,
    receivers,
    transferTo,
    description,
    batchedTxOverrides,
    salt: maybeSalt,
    latestVotingRoundId
  } = dripList;
  const { metadata: metadataSplitsReceivers, onChain: onChainSplitsReceivers } = await parseSplitsReceivers(adapter, receivers);
  const salt = maybeSalt ?? calculateRandomSalt();
  const { nftDriver, caller } = contractsRegistry[chainId];
  const minter = await adapter.getAddress();
  const dripListId = await calcDripListId(adapter, { salt, minter });
  const metadata = buildDripListMetadata({
    name,
    isVisible,
    dripListId,
    description,
    receivers: metadataSplitsReceivers,
    latestVotingRoundId
  });
  const ipfsHash = await ipfsMetadataUploaderFn(metadata);
  const txs = [];
  const mintTx = buildTx({
    contract: nftDriver.address,
    abi: nftDriverAbi,
    functionName: "safeMintWithSalt",
    args: [
      salt,
      transferTo ?? minter,
      [encodeMetadataKeyValue({ key: USER_METADATA_KEY, value: ipfsHash })]
    ]
  });
  txs.push(mintTx);
  if (onChainSplitsReceivers.length > 0) {
    const setSplitsTx = buildTx({
      abi: nftDriverAbi,
      contract: nftDriver.address,
      functionName: "setSplits",
      args: [dripListId, onChainSplitsReceivers]
    });
    txs.push(setSplitsTx);
  }
  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: "callBatched",
    args: [txs.map(convertToCallerCall)],
    batchedTxOverrides
  });
  return { preparedTx, metadata, ipfsHash, salt, dripListId };
}

// src/internal/drip-lists/createDripList.ts
async function createDripList(adapter, ipfsMetadataUploaderFn, dripList) {
  const { salt, ipfsHash, dripListId, preparedTx, metadata } = await prepareDripListCreation(adapter, ipfsMetadataUploaderFn, dripList);
  const txResponse = await adapter.sendTx(preparedTx);
  return {
    salt,
    metadata,
    ipfsHash,
    dripListId,
    txResponse
  };
}
var DEFAULT_GRAPHQL_URL = "https://drips-multichain-api.up.railway.app";
function createGraphQLClient(url = DEFAULT_GRAPHQL_URL, apiKey) {
  if (!url) {
    throw new DripsError("Missing required GraphQL endpoint");
  }
  const headers = {};
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  const client = new GraphQLClient(url, { headers });
  return {
    query: async (query, variables) => {
      try {
        return await client.request(query, variables);
      } catch (error) {
        throw new DripsError("GraphQL query failed", {
          cause: error,
          meta: {
            operation: "GraphQLClient.query",
            query,
            variables
          }
        });
      }
    }
  };
}
var GET_DRIP_LIST_QUERY = gql`
  query GetDripList($accountId: ID!, $chain: SupportedChain!) {
    dripList(id: $accountId, chain: $chain) {
      account {
        accountId
        driver
      }
      chain
      description
      isVisible
      lastProcessedIpfsHash
      latestMetadataIpfsHash
      latestVotingRoundId
      name
      owner {
        accountId
        driver
        address
      }
      previousOwnerAddress
      splits {
        ... on ProjectReceiver {
          __typename
          weight
          account {
            accountId
            driver
          }
          project {
            source {
              forge
              ownerName
              repoName
              url
            }
          }
        }
        ... on DripListReceiver {
          __typename
          weight
          account {
            accountId
            driver
          }
        }
        ... on AddressReceiver {
          __typename
          weight
          account {
            accountId
            address
            driver
          }
        }
        ... on SubListReceiver {
          __typename
          weight
          account {
            accountId
            driver
          }
        }
        ... on EcosystemMainAccountReceiver {
          __typename
          weight
          account {
            accountId
            driver
          }
        }
        ... on LinkedIdentityReceiver {
          __typename
          weight
          account {
            accountId
            driver
          }
        }
      }
      support {
        ... on OneTimeDonationSupport {
          __typename
          date
          account {
            accountId
            address
            driver
          }
          amount {
            amount
            tokenAddress
          }
        }
        ... on StreamSupport {
          __typename
          account {
            accountId
            address
            driver
          }
          stream {
            id
            name
            config {
              amountPerSecond {
                amount
                tokenAddress
              }
              dripId
              durationSeconds
              raw
              startDate
            }
          }
        }
      }
    }
  }
`;
async function getDripListById(id, chainId, graphqlClient) {
  requireGraphQLSupportedChain(chainId, getDripListById.name);
  const chain = graphqlChainMap[chainId];
  const variables = {
    chain,
    accountId: id.toString()
  };
  const client = graphqlClient || createGraphQLClient();
  const res = await client.query(
    GET_DRIP_LIST_QUERY,
    variables
  );
  return res.dripList ?? null;
}

// src/internal/drip-lists/prepareDripListUpdate.ts
async function prepareDripListUpdate(adapter, ipfsMetadataUploaderFn, config, graphqlClient) {
  const operation = prepareDripListUpdate.name;
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  const {
    dripListId,
    metadata: maybeMetadata,
    receivers: maybeReceivers,
    batchedTxOverrides
  } = config;
  const dripList = await getDripListById(dripListId, chainId, graphqlClient);
  if (!dripList) {
    throw new DripsError(`Drip list with ID ${dripListId} not found`, {
      meta: { operation }
    });
  }
  if (!maybeReceivers && !maybeMetadata) {
    throw new DripsError(
      "Nothing to update: no receivers or metadata provided",
      {
        meta: { operation }
      }
    );
  }
  const effectiveSplitsReceivers = maybeReceivers ?? mapApiSplitsToSdkSplitsReceivers(dripList.splits);
  const { metadata: metadataSplitsReceivers, onChain: onChainSplitsReceivers } = await parseSplitsReceivers(adapter, effectiveSplitsReceivers);
  const metadata = buildDripListMetadata({
    dripListId,
    receivers: metadataSplitsReceivers,
    name: maybeMetadata?.name ?? dripList.name,
    isVisible: maybeMetadata?.isVisible ?? dripList.isVisible,
    description: maybeMetadata?.description ?? dripList.description
  });
  const ipfsHash = await ipfsMetadataUploaderFn(metadata);
  const { nftDriver, caller } = contractsRegistry[chainId];
  const txs = [];
  txs.push(
    buildTx({
      abi: nftDriverAbi,
      functionName: "emitAccountMetadata",
      args: [
        dripListId,
        [encodeMetadataKeyValue({ key: USER_METADATA_KEY, value: ipfsHash })]
      ],
      contract: nftDriver.address
    })
  );
  if (maybeReceivers !== void 0) {
    txs.push(
      buildTx({
        abi: nftDriverAbi,
        contract: nftDriver.address,
        functionName: "setSplits",
        args: [dripListId, onChainSplitsReceivers]
      })
    );
  }
  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: "callBatched",
    args: [txs.map(convertToCallerCall)],
    batchedTxOverrides
  });
  return {
    preparedTx,
    ipfsHash,
    metadata
  };
}

// src/internal/drip-lists/updateDripList.ts
async function updateDripList(adapter, ipfsMetadataUploaderFn, config, graphqlClient) {
  const { ipfsHash, metadata, preparedTx } = await prepareDripListUpdate(
    adapter,
    ipfsMetadataUploaderFn,
    config,
    graphqlClient
  );
  const txResponse = await adapter.sendTx(preparedTx);
  return {
    ipfsHash,
    metadata,
    txResponse
  };
}

// src/sdk/createDripListsModule.ts
function createDripListsModule(deps) {
  const { adapter, graphqlClient, ipfsMetadataUploaderFn } = deps;
  return {
    calculateId: (salt, minter) => calcDripListId(adapter, {
      salt,
      minter
    }),
    getById: (accountId, chainId) => getDripListById(accountId, chainId, graphqlClient),
    prepareCreate: (dripList) => {
      requireWriteAccess(adapter, createDripList.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, createDripList.name);
      return prepareDripListCreation(adapter, ipfsMetadataUploaderFn, dripList);
    },
    create: (dripList) => {
      requireWriteAccess(adapter, createDripList.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, createDripList.name);
      return createDripList(adapter, ipfsMetadataUploaderFn, dripList);
    },
    prepareUpdate: (config) => {
      requireWriteAccess(adapter, updateDripList.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, updateDripList.name);
      return prepareDripListUpdate(
        adapter,
        ipfsMetadataUploaderFn,
        config,
        graphqlClient
      );
    },
    update: (config) => {
      requireWriteAccess(adapter, updateDripList.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, updateDripList.name);
      return updateDripList(
        adapter,
        ipfsMetadataUploaderFn,
        config,
        graphqlClient
      );
    }
  };
}

// src/internal/shared/filterCurrentChain.ts
function filterCurrentChain(items, chain) {
  if (!Array.isArray(items)) {
    throw new DripsError(
      `Expected an array of items for chain "${chain}", but got invalid input.`,
      {
        meta: {
          operation: filterCurrentChain.name
        }
      }
    );
  }
  const matches = items.filter((item) => item.chain === chain);
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new DripsError(`No item found for chain "${chain}".`, {
      meta: {
        operation: filterCurrentChain.name
      }
    });
  }
  throw new DripsError(
    `Expected exactly one item for chain "${chain}", but found ${matches.length}.`,
    {
      meta: {
        operation: filterCurrentChain.name
      }
    }
  );
}

// src/internal/streams/getCurrentStreamReceivers.ts
var GET_CURRENT_STREAM_RECEIVERS_QUERY = gql`
  query GetCurrentStreams($userAccountId: ID!, $chains: [SupportedChain!]) {
    userById(accountId: $userAccountId, chains: $chains) {
      chainData {
        chain
        streams {
          outgoing {
            id
            name
            isPaused
            config {
              raw
              amountPerSecond {
                tokenAddress
              }
              dripId
              amountPerSecond {
                amount
              }
              durationSeconds
              startDate
            }
            receiver {
              ... on User {
                account {
                  accountId
                }
              }
              ... on DripList {
                account {
                  accountId
                }
              }
              ... on EcosystemMainAccount {
                account {
                  accountId
                }
              }
            }
          }
        }
      }
    }
  }
`;
async function getCurrentStreamsAndReceivers(accountId, chainId, erc20, graphqlClient) {
  requireGraphQLSupportedChain(chainId, getCurrentStreamsAndReceivers.name);
  const chain = graphqlChainMap[chainId];
  const variables = {
    userAccountId: accountId.toString(),
    chains: [chain]
  };
  const client = graphqlClient || createGraphQLClient();
  const res = await client.query(
    GET_CURRENT_STREAM_RECEIVERS_QUERY,
    variables
  );
  const chainData = filterCurrentChain(res.userById.chainData, chain);
  const { outgoing: allStreams } = chainData.streams;
  const matchesToken = (stream) => stream.config?.amountPerSecond?.tokenAddress?.toLowerCase() === erc20.toLowerCase();
  const isActive = (stream) => !stream.isPaused;
  const toOnChainReceiver = (stream) => ({
    accountId: BigInt(stream.receiver?.account?.accountId),
    config: BigInt(stream.config.raw)
  });
  const currentStreams = allStreams.filter(
    (stream) => matchesToken(stream) && isActive(stream)
  );
  const currentReceivers = currentStreams.map(toOnChainReceiver);
  return {
    currentStreams,
    currentReceivers
  };
}
var numericTest = /^\d+$/;
function encodeStreamId(senderAccountId, tokenAddress, dripId) {
  if (!(numericTest.test(senderAccountId) && numericTest.test(dripId) && isAddress(tokenAddress))) {
    throw new Error("Invalid values");
  }
  return `${senderAccountId}-${tokenAddress.toLowerCase()}-${dripId}`;
}
var ethAddressSchema = z.preprocess((v) => {
  if (typeof v !== "string" || !isAddress(v)) {
    throw new Error(`${v} is not a valid address`);
  }
  return v;
}, z.string());
var bigintSchema = z.preprocess(
  (v) => typeof v === "string" ? BigInt(v) : v,
  z.bigint()
);
var streamConfigSchema = z.object({
  raw: z.string(),
  dripId: z.string(),
  amountPerSecond: bigintSchema,
  /** If zero, the stream runs indefinitely. */
  durationSeconds: z.number(),
  /**
   * If undefined, the block timestamp from the initial setStreams event
   * corresponding to this stream should be considered as the stream
   * start date.
   */
  startTimestamp: z.number().optional()
});
var dripsUserSchema = z.object({
  driver: z.union([z.literal("address"), z.literal("nft"), z.literal("repo")]),
  accountId: z.string()
});
var streamMetadataSchema = z.object({
  id: z.string(),
  initialDripsConfig: streamConfigSchema,
  receiver: dripsUserSchema,
  archived: z.boolean(),
  name: z.string().optional(),
  description: z.string().optional()
});
var assetConfigMetadataSchema = z.object({
  tokenAddress: ethAddressSchema,
  streams: z.array(streamMetadataSchema)
});
var addressDriverAccountMetadataSchemaV1 = z.object({
  describes: z.object({
    driver: z.literal("address"),
    accountId: z.string()
  }),
  name: z.string().optional(),
  description: z.string().optional(),
  emoji: z.string().optional(),
  assetConfigs: z.array(assetConfigMetadataSchema),
  timestamp: z.number(),
  writtenByAddress: ethAddressSchema
});
var gitHubSourceSchema = z.object({
  forge: z.literal("github"),
  repoName: z.string(),
  ownerName: z.string(),
  url: z.string()
});
var sourceSchema = gitHubSourceSchema;

// src/internal/metadata/schemas/repo-driver/v2.ts
var addressDriverSplitReceiverSchema = z.object({
  type: z.literal("address"),
  weight: z.number(),
  accountId: z.string()
});
var repoDriverSplitReceiverSchema = z.object({
  type: z.literal("repoDriver"),
  weight: z.number(),
  accountId: z.string(),
  source: sourceSchema
});
var repoDriverAccountSplitsSchema = z.object({
  maintainers: z.array(addressDriverSplitReceiverSchema),
  dependencies: z.array(
    z.union([repoDriverSplitReceiverSchema, addressDriverSplitReceiverSchema])
  )
});
var repoDriverAccountMetadataSchemaV2 = z.object({
  driver: z.literal("repo"),
  describes: z.object({
    driver: z.literal("repo"),
    accountId: z.string()
  }),
  source: sourceSchema,
  emoji: z.string(),
  color: z.string(),
  description: z.string().optional(),
  splits: repoDriverAccountSplitsSchema
});
var addressDriverSplitReceiverSchema2 = z.object({
  type: z.literal("address"),
  weight: z.number(),
  accountId: z.string()
});
var repoDriverSplitReceiverSchema2 = z.object({
  type: z.literal("repoDriver"),
  weight: z.number(),
  accountId: z.string(),
  source: sourceSchema
});
var dripListSplitReceiverSchema = z.object({
  type: z.literal("dripList"),
  weight: z.number(),
  accountId: z.string()
});
var nftDriverAccountMetadataSchemaV2 = z.object({
  driver: z.literal("nft"),
  describes: z.object({
    driver: z.literal("nft"),
    accountId: z.string()
  }),
  isDripList: z.literal(true),
  projects: z.array(
    z.union([
      dripListSplitReceiverSchema,
      repoDriverSplitReceiverSchema2,
      addressDriverSplitReceiverSchema2
    ])
  ),
  name: z.string().optional()
});
var repoSubAccountDriverSplitReceiverSchema = z6.object({
  type: z6.literal("repoSubAccountDriver"),
  weight: z6.number(),
  accountId: z6.string(),
  source: sourceSchema
});

// src/internal/metadata/schemas/immutable-splits-driver/v1.ts
var subListSplitReceiverSchema = z6.object({
  type: z6.literal("subList"),
  weight: z6.number(),
  accountId: z6.string()
});
var subListMetadataSchemaV1 = z6.object({
  driver: z6.literal("immutable-splits"),
  type: z6.literal("subList"),
  recipients: z6.array(
    z6.union([
      addressDriverSplitReceiverSchema,
      dripListSplitReceiverSchema,
      repoSubAccountDriverSplitReceiverSchema,
      subListSplitReceiverSchema
    ])
  ),
  parent: z6.object({
    accountId: z6.string(),
    driver: z6.union([z6.literal("nft"), z6.literal("immutable-splits")]),
    type: z6.union([
      z6.literal("dripList"),
      z6.literal("ecosystem"),
      z6.literal("subList")
    ])
  }),
  root: z6.object({
    accountId: z6.string(),
    driver: z6.union([z6.literal("nft"), z6.literal("immutable-splits")]),
    type: z6.union([
      z6.literal("dripList"),
      z6.literal("ecosystem"),
      z6.literal("subList")
    ])
  })
});
var addressDriverSplitReceiverSchema3 = z.object({
  weight: z.number(),
  accountId: z.string()
});
var repoDriverSplitReceiverSchema3 = z.object({
  weight: z.number(),
  accountId: z.string(),
  source: sourceSchema
});
var nftDriverAccountMetadataSchemaV1 = z.object({
  driver: z.literal("nft"),
  describes: z.object({
    driver: z.literal("nft"),
    accountId: z.string()
  }),
  isDripList: z.literal(true),
  projects: z.array(
    z.union([repoDriverSplitReceiverSchema3, addressDriverSplitReceiverSchema3])
  ),
  name: z.string().optional()
});
var nftDriverAccountMetadataSchemaV3 = nftDriverAccountMetadataSchemaV2.extend({
  description: z.string().optional()
});
var nftDriverAccountMetadataSchemaV4 = nftDriverAccountMetadataSchemaV3.extend({
  latestVotingRoundId: z.string().optional()
});
var nftDriverAccountMetadataSchemaV5 = nftDriverAccountMetadataSchemaV4.extend({
  isVisible: z.boolean()
});
var dripListSplitReceiverSchema2 = z.object({
  type: z.literal("dripList"),
  weight: z.number(),
  accountId: z.string()
});
var repoDriverAccountSplitsSchema2 = z.object({
  maintainers: z.array(addressDriverSplitReceiverSchema),
  dependencies: z.array(
    z.union([
      dripListSplitReceiverSchema2,
      repoDriverSplitReceiverSchema,
      addressDriverSplitReceiverSchema
    ])
  )
});
var repoDriverAccountMetadataSchemaV3 = repoDriverAccountMetadataSchemaV2.extend({
  splits: repoDriverAccountSplitsSchema2
});

// src/internal/metadata/schemas/repo-driver/v4.ts
var emojiAvatarSchema = z.object({
  type: z.literal("emoji"),
  emoji: z.string()
});
var imageAvatarSchema = z.object({
  type: z.literal("image"),
  cid: z.string()
});
var repoDriverAccountMetadataSchemaV4 = repoDriverAccountMetadataSchemaV3.extend({
  emoji: z.undefined().optional(),
  avatar: z.union([emojiAvatarSchema, imageAvatarSchema])
});

// src/internal/metadata/schemas/nft-driver/v6.ts
var base = nftDriverAccountMetadataSchemaV5.omit({
  isDripList: true,
  projects: true
}).extend({
  isDripList: z.undefined().optional(),
  projects: z.undefined().optional()
});
var ecosystemVariant = base.extend({
  type: z.literal("ecosystem"),
  recipients: z.array(
    z.union([
      repoSubAccountDriverSplitReceiverSchema,
      subListSplitReceiverSchema
    ])
  ),
  color: z.string(),
  avatar: emojiAvatarSchema
});
var dripListVariant = base.extend({
  type: z.literal("dripList"),
  recipients: z.array(
    z.union([
      repoDriverSplitReceiverSchema,
      subListSplitReceiverSchema,
      addressDriverSplitReceiverSchema,
      dripListSplitReceiverSchema
    ])
  )
});
var nftDriverAccountMetadataSchemaV6 = z.discriminatedUnion("type", [
  ecosystemVariant,
  dripListVariant
]);
var addressDriverSplitReceiverSchema4 = z.object({
  weight: z.number(),
  accountId: z.string()
});
var repoDriverSplitReceiverSchema4 = z.object({
  weight: z.number(),
  accountId: z.string(),
  source: sourceSchema
});
var repoDriverAccountSplitsSchema3 = z.object({
  maintainers: z.array(addressDriverSplitReceiverSchema4),
  dependencies: z.array(
    z.union([repoDriverSplitReceiverSchema4, addressDriverSplitReceiverSchema4])
  )
});
var repoDriverAccountMetadataSchemaV1 = z.object({
  driver: z.literal("repo"),
  describes: z.object({
    driver: z.literal("repo"),
    accountId: z.string()
  }),
  source: sourceSchema,
  emoji: z.string(),
  color: z.string(),
  description: z.string().optional(),
  splits: repoDriverAccountSplitsSchema3
});
var repoDriverAccountMetadataSchemaV5 = repoDriverAccountMetadataSchemaV4.extend({
  isVisible: z.boolean()
});
var orcidSplitReceiverSchema = z6.object({
  type: z6.literal("orcid"),
  weight: z6.number(),
  accountId: z6.string(),
  orcidId: z6.string()
});

// src/internal/metadata/schemas/nft-driver/v7.ts
var dripListVariantV7 = dripListVariant.extend({
  recipients: z.array(
    z.union([
      ...dripListVariant.shape.recipients._def.type.options,
      orcidSplitReceiverSchema
    ])
  )
});
var nftDriverAccountMetadataSchemaV7 = z.discriminatedUnion("type", [
  nftDriverAccountMetadataSchemaV6._def.options[0],
  dripListVariantV7
]);

// src/internal/metadata/schemas/index.ts
var nftDriverAccountMetadataParser = createVersionedParser([
  nftDriverAccountMetadataSchemaV7.parse,
  nftDriverAccountMetadataSchemaV6.parse,
  nftDriverAccountMetadataSchemaV5.parse,
  nftDriverAccountMetadataSchemaV4.parse,
  nftDriverAccountMetadataSchemaV3.parse,
  nftDriverAccountMetadataSchemaV2.parse,
  nftDriverAccountMetadataSchemaV1.parse
]);
var addressDriverAccountMetadataParser = createVersionedParser([
  addressDriverAccountMetadataSchemaV1.parse
]);
var repoDriverAccountMetadataParser = createVersionedParser([
  repoDriverAccountMetadataSchemaV5.parse,
  repoDriverAccountMetadataSchemaV4.parse,
  repoDriverAccountMetadataSchemaV3.parse,
  repoDriverAccountMetadataSchemaV2.parse,
  repoDriverAccountMetadataSchemaV1.parse
]);
var immutableSplitsDriverMetadataParser = createVersionedParser([
  subListMetadataSchemaV1.parse
]);

// src/internal/streams/buildStreamsMetadata.ts
async function buildStreamsMetadata(adapter, accountId, streams, newStream) {
  const streamsByTokenAddress = streams.reduce(
    (acc, stream) => ({
      ...acc,
      [stream.config.amountPerSecond.tokenAddress.toLowerCase()]: [
        ...acc[stream.config.amountPerSecond.tokenAddress.toLowerCase()] ?? [],
        stream
      ]
    }),
    {}
  );
  const newStreamsByTokenAddress = newStream ? {
    ...streamsByTokenAddress,
    [newStream.erc20.toLowerCase()]: [
      ...streamsByTokenAddress[newStream.erc20.toLowerCase()] ?? [],
      {
        id: encodeStreamId(
          accountId.toString(),
          newStream.erc20,
          newStream.dripId.toString()
        ),
        name: newStream.name,
        config: {
          raw: encodeStreamConfig({
            dripId: newStream.dripId,
            start: BigInt(newStream.startAt?.getTime() ?? 0) / 1000n,
            // Convert to seconds.
            duration: BigInt(newStream.durationSeconds ?? 0),
            amountPerSec: parseStreamRate(
              newStream.amount,
              newStream.timeUnit,
              newStream.tokenDecimals
            )
          }).toString(),
          dripId: newStream.dripId.toString(),
          amountPerSecond: {
            amount: parseStreamRate(
              newStream.amount,
              newStream.timeUnit,
              newStream.tokenDecimals
            ).toString()
          },
          durationSeconds: newStream.durationSeconds,
          startDate: newStream.startAt?.toISOString() ?? (/* @__PURE__ */ new Date()).toISOString()
        },
        receiver: {
          account: {
            accountId: await resolveReceiverAccountId(
              adapter,
              newStream.receiver
            )
          }
        }
      }
    ]
  } : streamsByTokenAddress;
  return addressDriverAccountMetadataParser.parseLatest({
    describes: {
      driver: "address",
      accountId: accountId.toString()
    },
    assetConfigs: Object.entries(newStreamsByTokenAddress).map(
      ([tokenAddress, streams2]) => {
        return {
          tokenAddress,
          streams: streams2.map((stream) => {
            const recipientDriver = resolveDriverName(
              BigInt(stream.receiver.account.accountId)
            );
            let supportedDriver;
            if (["address", "nft", "repo"].includes(recipientDriver)) {
              supportedDriver = recipientDriver;
            } else {
              throw new Error(
                `Unsupported recipient driver: ${recipientDriver}`
              );
            }
            return {
              id: stream.id,
              initialDripsConfig: {
                raw: stream.config.raw,
                dripId: stream.config.dripId,
                amountPerSecond: BigInt(stream.config.amountPerSecond.amount),
                durationSeconds: Number(stream.config.durationSeconds || 0),
                startTimestamp: Math.floor(
                  new Date(stream.config.startDate).getTime() / 1e3
                )
              },
              receiver: {
                driver: supportedDriver,
                accountId: stream.receiver.account.accountId.toString()
              },
              archived: false,
              name: stream.name ?? void 0
            };
          })
        };
      }
    ),
    timestamp: Math.floor((/* @__PURE__ */ new Date()).getTime() / 1e3),
    writtenByAddress: resolveAddressFromAddressDriverId(accountId)
  });
}

// src/internal/shared/randomBigintUntilUnique.ts
function randomBigintUntilUnique(existing, byteLength) {
  const randomBigint = () => {
    const bytes = new Uint8Array(byteLength);
    globalThis.crypto.getRandomValues(bytes);
    let result2 = 0n;
    for (let i = 0; i < byteLength; i++) {
      result2 |= BigInt(bytes[i]) << BigInt(i * 8);
    }
    return result2;
  };
  let result = randomBigint();
  while (existing.includes(result)) {
    result = randomBigint();
  }
  return result;
}

// src/internal/donations/prepareContinuousDonation.ts
async function prepareContinuousDonation(adapter, ipfsMetadataUploaderFn, donation, graphqlClient) {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  const {
    erc20,
    amount,
    startAt,
    timeUnit,
    receiver,
    topUpAmount,
    tokenDecimals,
    durationSeconds,
    batchedTxOverrides
  } = donation;
  const signerAddress = await adapter.getAddress();
  const signerAccountId = await resolveReceiverAccountId(adapter, {
    type: "address",
    address: signerAddress
  });
  const receiverAccountId = await resolveReceiverAccountId(adapter, receiver);
  const { addressDriver, caller } = contractsRegistry[chainId];
  const { currentReceivers: unformattedCurrentReceivers, currentStreams } = await getCurrentStreamsAndReceivers(
    signerAccountId,
    chainId,
    erc20,
    graphqlClient
  );
  const currentReceivers = validateAndFormatStreamReceivers(
    unformattedCurrentReceivers
  );
  const newStreamDripId = randomBigintUntilUnique(
    currentReceivers.map((r) => decodeStreamConfig(r.config).dripId),
    4
  );
  const amountPerSec = parseStreamRate(amount, timeUnit, tokenDecimals);
  validateStreamRate(amountPerSec);
  const streamConfig = {
    dripId: newStreamDripId,
    amountPerSec,
    start: BigInt(startAt?.getTime() ?? 0) / 1000n,
    // Convert to seconds.
    duration: durationSeconds ?? 0n
  };
  const newStreamConfig = encodeStreamConfig(streamConfig);
  const newReceivers = validateAndFormatStreamReceivers([
    ...currentReceivers,
    {
      config: newStreamConfig,
      accountId: receiverAccountId
    }
  ]);
  const setStreamsTx = buildTx({
    abi: addressDriverAbi,
    functionName: "setStreams",
    contract: addressDriver.address,
    args: [
      erc20,
      currentReceivers,
      parseUnits(topUpAmount ?? "0", tokenDecimals),
      newReceivers,
      0,
      0,
      signerAddress
    ]
  });
  const newMetadata = await buildStreamsMetadata(
    adapter,
    signerAccountId,
    currentStreams,
    {
      ...donation,
      dripId: newStreamDripId
    }
  );
  const newIpfsHash = await ipfsMetadataUploaderFn(newMetadata);
  const emitAccountMetadataTx = buildTx({
    abi: addressDriverAbi,
    functionName: "emitAccountMetadata",
    args: [
      [encodeMetadataKeyValue({ key: USER_METADATA_KEY, value: newIpfsHash })]
    ],
    contract: addressDriver.address
  });
  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: "callBatched",
    args: [[setStreamsTx, emitAccountMetadataTx].map(convertToCallerCall)],
    batchedTxOverrides
  });
  return {
    preparedTx,
    ipfsHash: newIpfsHash,
    metadata: newMetadata
  };
}
async function prepareOneTimeDonation(adapter, donation) {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  const { receiver, erc20, amount, batchedTxOverrides, tokenDecimals } = donation;
  const amountInWei = parseUnits(amount, tokenDecimals);
  const receiverId = await resolveReceiverAccountId(adapter, receiver);
  return buildTx({
    abi: addressDriverAbi,
    functionName: "give",
    args: [receiverId, erc20, amountInWei],
    contract: contractsRegistry[chainId].addressDriver.address,
    batchedTxOverrides
  });
}

// src/internal/donations/sendContinuousDonation.ts
async function sendContinuousDonation(adapter, ipfsMetadataUploaderFn, donation, graphqlClient) {
  const { preparedTx, ipfsHash, metadata } = await prepareContinuousDonation(
    adapter,
    ipfsMetadataUploaderFn,
    donation,
    graphqlClient
  );
  const txResponse = await adapter.sendTx(preparedTx);
  return {
    txResponse,
    ipfsHash,
    metadata
  };
}

// src/internal/donations/sendOneTimeDonation.ts
async function sendOneTimeDonation(adapter, donation) {
  const preparedTx = await prepareOneTimeDonation(adapter, donation);
  return adapter.sendTx(preparedTx);
}

// src/sdk/createDonationsModule.ts
function createDonationsModule(deps) {
  const { adapter, graphqlClient, ipfsMetadataUploaderFn } = deps;
  return {
    prepareOneTime: (donation) => {
      requireWriteAccess(adapter, sendOneTimeDonation.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, sendOneTimeDonation.name);
      return prepareOneTimeDonation(adapter, donation);
    },
    sendOneTime: (donation) => {
      requireWriteAccess(adapter, sendOneTimeDonation.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, sendOneTimeDonation.name);
      return sendOneTimeDonation(adapter, donation);
    },
    prepareContinuous: (donation) => {
      requireWriteAccess(adapter, sendContinuousDonation.name);
      requireMetadataUploader(
        ipfsMetadataUploaderFn,
        sendContinuousDonation.name
      );
      return prepareContinuousDonation(
        adapter,
        ipfsMetadataUploaderFn,
        donation,
        graphqlClient
      );
    },
    sendContinuous: (donation) => {
      requireWriteAccess(adapter, sendContinuousDonation.name);
      requireMetadataUploader(
        ipfsMetadataUploaderFn,
        sendContinuousDonation.name
      );
      return sendContinuousDonation(
        adapter,
        ipfsMetadataUploaderFn,
        donation,
        graphqlClient
      );
    }
  };
}

// src/sdk/createUtilsModule.ts
function createUtilsModule(deps) {
  const { adapter } = deps;
  return {
    buildTx,
    calcAddressId: (address) => calcAddressId(adapter, address),
    calcProjectId: (forge, name) => calcProjectId(adapter, { forge, name }),
    calcOrcidAccountId: (orcidId) => calcOrcidAccountId(adapter, orcidId),
    encodeStreamConfig,
    decodeStreamConfig,
    resolveDriverName,
    resolveAddressFromAddressDriverId
  };
}

// src/internal/linked-identities/orcidUtils.ts
function assertValidOrcidId(orcidId) {
  if (typeof orcidId !== "string") {
    throw new DripsError("Invalid ORCID: expected string.", {
      meta: { operation: assertValidOrcidId.name, orcidId }
    });
  }
  const baseStr = orcidId.replace(/[-\s]/g, "");
  const orcidPattern = /^\d{15}[\dX]$/i;
  if (!orcidPattern.test(baseStr.toUpperCase())) {
    throw new DripsError("Invalid ORCID format.", {
      meta: { operation: assertValidOrcidId.name, orcidId }
    });
  }
  let total = 0;
  for (let i = 0; i < 15; i++) {
    const digit = parseInt(baseStr[i], 10);
    if (Number.isNaN(digit)) {
      throw new DripsError("Invalid ORCID digits.", {
        meta: { operation: assertValidOrcidId.name, orcidId }
      });
    }
    total = (total + digit) * 2;
  }
  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const calculatedCheckDigit = result === 10 ? "X" : String(result);
  const actualCheckDigit = baseStr.charAt(15).toUpperCase();
  if (calculatedCheckDigit !== actualCheckDigit) {
    throw new DripsError("Invalid ORCID checksum.", {
      meta: { operation: assertValidOrcidId.name, orcidId }
    });
  }
}
function normalizeOrcidForContract(orcidId) {
  const trimmed = (orcidId ?? "").trim();
  if (trimmed.length === 0) {
    throw new DripsError("ORCID is empty.", {
      meta: { operation: normalizeOrcidForContract.name, orcidId }
    });
  }
  return trimmed;
}
async function waitForOrcidOwnership(adapter, params) {
  const {
    orcidId,
    expectedOwner,
    pollIntervalMs = 3e3,
    timeoutMs = 12e4,
    onProgress
  } = params;
  assertValidOrcidId(orcidId);
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId, waitForOrcidOwnership.name);
  const accountId = await calcOrcidAccountId(adapter, orcidId);
  const repoDriverAddress = contractsRegistry[chainId].repoDriver.address;
  let targetOwner;
  if (expectedOwner) {
    targetOwner = expectedOwner;
  } else {
    if ("getAddress" in adapter && typeof adapter.getAddress === "function") {
      targetOwner = await adapter.getAddress();
    } else {
      throw new DripsError(
        "Expected owner address must be provided for read-only adapter.",
        {
          meta: { operation: waitForOrcidOwnership.name, orcidId }
        }
      );
    }
  }
  const startTime = Date.now();
  const endTime = startTime + timeoutMs;
  while (Date.now() < endTime) {
    const ownerOfTx = buildTx({
      abi: repoDriverAbi,
      contract: repoDriverAddress,
      functionName: "ownerOf",
      args: [accountId]
    });
    const encodedResult = await adapter.call(ownerOfTx);
    const currentOwner = decodeFunctionResult({
      abi: repoDriverAbi,
      functionName: "ownerOf",
      data: encodedResult
    });
    if (currentOwner.toLowerCase() === targetOwner.toLowerCase()) {
      return;
    }
    const elapsedMs = Date.now() - startTime;
    await onProgress?.(elapsedMs);
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new DripsError(`Ownership confirmation timeout after ${timeoutMs}ms.`, {
    meta: {
      operation: waitForOrcidOwnership.name,
      orcidId,
      accountId: accountId.toString(),
      expectedOwner: targetOwner,
      timeoutMs
    }
  });
}

// src/internal/linked-identities/claimOrcid.ts
var ORCID_FORGE_ID = 2;
async function claimOrcid(adapter, params) {
  const { orcidId, waitOptions, onProgress } = params;
  assertValidOrcidId(orcidId);
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId, claimOrcid.name);
  const repoDriverAddress = contractsRegistry[chainId].repoDriver.address;
  const orcidAccountId = await calcOrcidAccountId(adapter, orcidId);
  let claimResult;
  let ownershipResult;
  let splitsResult;
  await onProgress?.("claiming", "Submitting claim transaction");
  try {
    const requestUpdateOwnerTx = buildTx({
      abi: repoDriverAbi,
      contract: repoDriverAddress,
      functionName: "requestUpdateOwner",
      args: [ORCID_FORGE_ID, toHex(normalizeOrcidForContract(orcidId))]
    });
    const claimResponse = await adapter.sendTx(requestUpdateOwnerTx);
    const receipt = await claimResponse.wait();
    claimResult = {
      success: true,
      data: {
        hash: claimResponse.hash,
        mined: receipt.status === "success"
      }
    };
  } catch (error) {
    claimResult = {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
    return {
      orcidAccountId,
      claim: claimResult,
      ownership: { success: false, error: new Error("Claim step failed") },
      splits: { success: false, error: new Error("Claim step failed") },
      status: "failed"
    };
  }
  await onProgress?.("waiting", "Polling for ownership confirmation");
  const ownershipStartTime = Date.now();
  try {
    const ownerAddress = await adapter.getAddress();
    await waitForOrcidOwnership(adapter, {
      orcidId,
      expectedOwner: ownerAddress,
      ...waitOptions,
      onProgress: waitOptions?.onProgress
    });
    ownershipResult = {
      success: true,
      data: {
        owner: ownerAddress,
        verificationTimeMs: Date.now() - ownershipStartTime
      }
    };
  } catch (error) {
    ownershipResult = {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
    return {
      orcidAccountId,
      claim: claimResult,
      ownership: ownershipResult,
      splits: { success: false, error: new Error("Ownership step failed") },
      status: "partial"
    };
  }
  await onProgress?.("configuring", "Setting splits configuration");
  try {
    const claimerAddress = await adapter.getAddress();
    const claimerAccountId = await calcAddressId(adapter, claimerAddress);
    const receivers = [
      {
        accountId: claimerAccountId,
        weight: TOTAL_SPLITS_WEIGHT
      }
    ];
    const setSplitsTx = buildTx({
      abi: repoDriverAbi,
      contract: repoDriverAddress,
      functionName: "setSplits",
      args: [orcidAccountId, receivers]
    });
    const setSplitsResponse = await adapter.sendTx(setSplitsTx);
    const receipt = await setSplitsResponse.wait();
    splitsResult = {
      success: true,
      data: {
        hash: setSplitsResponse.hash,
        mined: receipt.status === "success"
      }
    };
  } catch (error) {
    splitsResult = {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
    return {
      orcidAccountId,
      claim: claimResult,
      ownership: ownershipResult,
      splits: splitsResult,
      status: "partial"
    };
  }
  return {
    orcidAccountId,
    claim: claimResult,
    ownership: ownershipResult,
    splits: splitsResult,
    status: "complete"
  };
}

// src/sdk/createLinkedIdentitiesModule.ts
function createLinkedIdentitiesModule(deps) {
  const { adapter } = deps;
  return {
    claimOrcid: (params) => {
      requireWriteAccess(adapter, claimOrcid.name);
      return claimOrcid(adapter, params);
    },
    waitForOrcidOwnership: (params) => {
      return waitForOrcidOwnership(adapter, params);
    }
  };
}

// src/internal/abis/dripsAbi.ts
var dripsAbi = [
  {
    inputs: [{ internalType: "uint32", name: "cycleSecs_", type: "uint32" }],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "key",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "value",
        type: "bytes"
      }
    ],
    name: "AccountMetadataEmitted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "previousAdmin",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "newAdmin",
        type: "address"
      }
    ],
    name: "AdminChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "beacon",
        type: "address"
      }
    ],
    name: "BeaconUpgraded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amt",
        type: "uint128"
      }
    ],
    name: "Collectable",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "collected",
        type: "uint128"
      }
    ],
    name: "Collected",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint32",
        name: "driverId",
        type: "uint32"
      },
      {
        indexed: true,
        internalType: "address",
        name: "oldDriverAddr",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newDriverAddr",
        type: "address"
      }
    ],
    name: "DriverAddressUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint32",
        name: "driverId",
        type: "uint32"
      },
      {
        indexed: true,
        internalType: "address",
        name: "driverAddr",
        type: "address"
      }
    ],
    name: "DriverRegistered",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "receiver",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amt",
        type: "uint128"
      }
    ],
    name: "Given",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "currentAdmin",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "newAdmin",
        type: "address"
      }
    ],
    name: "NewAdminProposed",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "Paused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address"
      }
    ],
    name: "PauserGranted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "admin",
        type: "address"
      }
    ],
    name: "PauserRevoked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amt",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "receivableCycles",
        type: "uint32"
      }
    ],
    name: "ReceivedStreams",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "receiver",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amt",
        type: "uint128"
      }
    ],
    name: "Split",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "receiversHash",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "weight",
        type: "uint32"
      }
    ],
    name: "SplitsReceiverSeen",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "receiversHash",
        type: "bytes32"
      }
    ],
    name: "SplitsSet",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "senderId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amt",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "bytes32[]",
        name: "streamsHistoryHashes",
        type: "bytes32[]"
      }
    ],
    name: "SqueezedStreams",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "receiversHash",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "StreamConfig",
        name: "config",
        type: "uint256"
      }
    ],
    name: "StreamReceiverSeen",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "accountId",
        type: "uint256"
      },
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "receiversHash",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "streamsHistoryHash",
        type: "bytes32"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "balance",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "maxEnd",
        type: "uint32"
      }
    ],
    name: "StreamsSet",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "pauser",
        type: "address"
      }
    ],
    name: "Unpaused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "implementation",
        type: "address"
      }
    ],
    name: "Upgraded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "contract IERC20",
        name: "erc20",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "receiver",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amt",
        type: "uint256"
      }
    ],
    name: "Withdrawn",
    type: "event"
  },
  {
    inputs: [],
    name: "AMT_PER_SEC_EXTRA_DECIMALS",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "AMT_PER_SEC_MULTIPLIER",
    outputs: [{ internalType: "uint160", name: "", type: "uint160" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "DRIVER_ID_OFFSET",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "MAX_SPLITS_RECEIVERS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "MAX_STREAMS_RECEIVERS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "MAX_TOTAL_BALANCE",
    outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "TOTAL_SPLITS_WEIGHT",
    outputs: [{ internalType: "uint32", name: "", type: "uint32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "acceptAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "allPausers",
    outputs: [
      {
        internalType: "address[]",
        name: "pausersList",
        type: "address[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          {
            internalType: "StreamConfig",
            name: "config",
            type: "uint256"
          }
        ],
        internalType: "struct StreamReceiver[]",
        name: "currReceivers",
        type: "tuple[]"
      },
      { internalType: "uint32", name: "timestamp", type: "uint32" }
    ],
    name: "balanceAt",
    outputs: [{ internalType: "uint128", name: "balance", type: "uint128" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "contract IERC20", name: "erc20", type: "address" }],
    name: "balances",
    outputs: [
      {
        internalType: "uint128",
        name: "streamsBalance",
        type: "uint128"
      },
      { internalType: "uint128", name: "splitsBalance", type: "uint128" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" }
    ],
    name: "collect",
    outputs: [{ internalType: "uint128", name: "amt", type: "uint128" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" }
    ],
    name: "collectable",
    outputs: [{ internalType: "uint128", name: "amt", type: "uint128" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "cycleSecs",
    outputs: [{ internalType: "uint32", name: "", type: "uint32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint32", name: "driverId", type: "uint32" }],
    name: "driverAddress",
    outputs: [{ internalType: "address", name: "driverAddr", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      {
        components: [
          { internalType: "bytes32", name: "key", type: "bytes32" },
          { internalType: "bytes", name: "value", type: "bytes" }
        ],
        internalType: "struct AccountMetadata[]",
        name: "accountMetadata",
        type: "tuple[]"
      }
    ],
    name: "emitAccountMetadata",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "uint256", name: "receiver", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      { internalType: "uint128", name: "amt", type: "uint128" }
    ],
    name: "give",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "pauser", type: "address" }],
    name: "grantPauser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          { internalType: "uint32", name: "weight", type: "uint32" }
        ],
        internalType: "struct SplitsReceiver[]",
        name: "receivers",
        type: "tuple[]"
      }
    ],
    name: "hashSplits",
    outputs: [
      { internalType: "bytes32", name: "receiversHash", type: "bytes32" }
    ],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          {
            internalType: "StreamConfig",
            name: "config",
            type: "uint256"
          }
        ],
        internalType: "struct StreamReceiver[]",
        name: "receivers",
        type: "tuple[]"
      }
    ],
    name: "hashStreams",
    outputs: [{ internalType: "bytes32", name: "streamsHash", type: "bytes32" }],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "oldStreamsHistoryHash",
        type: "bytes32"
      },
      { internalType: "bytes32", name: "streamsHash", type: "bytes32" },
      { internalType: "uint32", name: "updateTime", type: "uint32" },
      { internalType: "uint32", name: "maxEnd", type: "uint32" }
    ],
    name: "hashStreamsHistory",
    outputs: [
      {
        internalType: "bytes32",
        name: "streamsHistoryHash",
        type: "bytes32"
      }
    ],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [],
    name: "implementation",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "isPaused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "pauser", type: "address" }],
    name: "isPauser",
    outputs: [{ internalType: "bool", name: "isAddrPauser", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "minAmtPerSec",
    outputs: [{ internalType: "uint160", name: "", type: "uint160" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "nextDriverId",
    outputs: [{ internalType: "uint32", name: "driverId", type: "uint32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "newAdmin", type: "address" }],
    name: "proposeNewAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "proposedAdmin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "proxiableUUID",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" }
    ],
    name: "receivableStreamsCycles",
    outputs: [{ internalType: "uint32", name: "cycles", type: "uint32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      { internalType: "uint32", name: "maxCycles", type: "uint32" }
    ],
    name: "receiveStreams",
    outputs: [{ internalType: "uint128", name: "receivedAmt", type: "uint128" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      { internalType: "uint32", name: "maxCycles", type: "uint32" }
    ],
    name: "receiveStreamsResult",
    outputs: [
      { internalType: "uint128", name: "receivableAmt", type: "uint128" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "driverAddr", type: "address" }],
    name: "registerDriver",
    outputs: [{ internalType: "uint32", name: "driverId", type: "uint32" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "pauser", type: "address" }],
    name: "revokePauser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          { internalType: "uint32", name: "weight", type: "uint32" }
        ],
        internalType: "struct SplitsReceiver[]",
        name: "receivers",
        type: "tuple[]"
      }
    ],
    name: "setSplits",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          {
            internalType: "StreamConfig",
            name: "config",
            type: "uint256"
          }
        ],
        internalType: "struct StreamReceiver[]",
        name: "currReceivers",
        type: "tuple[]"
      },
      { internalType: "int128", name: "balanceDelta", type: "int128" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          {
            internalType: "StreamConfig",
            name: "config",
            type: "uint256"
          }
        ],
        internalType: "struct StreamReceiver[]",
        name: "newReceivers",
        type: "tuple[]"
      },
      { internalType: "uint32", name: "maxEndHint1", type: "uint32" },
      { internalType: "uint32", name: "maxEndHint2", type: "uint32" }
    ],
    name: "setStreams",
    outputs: [
      { internalType: "int128", name: "realBalanceDelta", type: "int128" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          { internalType: "uint32", name: "weight", type: "uint32" }
        ],
        internalType: "struct SplitsReceiver[]",
        name: "currReceivers",
        type: "tuple[]"
      }
    ],
    name: "split",
    outputs: [
      {
        internalType: "uint128",
        name: "collectableAmt",
        type: "uint128"
      },
      { internalType: "uint128", name: "splitAmt", type: "uint128" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      {
        components: [
          { internalType: "uint256", name: "accountId", type: "uint256" },
          { internalType: "uint32", name: "weight", type: "uint32" }
        ],
        internalType: "struct SplitsReceiver[]",
        name: "currReceivers",
        type: "tuple[]"
      },
      { internalType: "uint128", name: "amount", type: "uint128" }
    ],
    name: "splitResult",
    outputs: [
      {
        internalType: "uint128",
        name: "collectableAmt",
        type: "uint128"
      },
      { internalType: "uint128", name: "splitAmt", type: "uint128" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "accountId", type: "uint256" }],
    name: "splitsHash",
    outputs: [
      { internalType: "bytes32", name: "currSplitsHash", type: "bytes32" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" }
    ],
    name: "splittable",
    outputs: [{ internalType: "uint128", name: "amt", type: "uint128" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      { internalType: "uint256", name: "senderId", type: "uint256" },
      { internalType: "bytes32", name: "historyHash", type: "bytes32" },
      {
        components: [
          {
            internalType: "bytes32",
            name: "streamsHash",
            type: "bytes32"
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "accountId",
                type: "uint256"
              },
              {
                internalType: "StreamConfig",
                name: "config",
                type: "uint256"
              }
            ],
            internalType: "struct StreamReceiver[]",
            name: "receivers",
            type: "tuple[]"
          },
          { internalType: "uint32", name: "updateTime", type: "uint32" },
          { internalType: "uint32", name: "maxEnd", type: "uint32" }
        ],
        internalType: "struct StreamsHistory[]",
        name: "streamsHistory",
        type: "tuple[]"
      }
    ],
    name: "squeezeStreams",
    outputs: [{ internalType: "uint128", name: "amt", type: "uint128" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      { internalType: "uint256", name: "senderId", type: "uint256" },
      { internalType: "bytes32", name: "historyHash", type: "bytes32" },
      {
        components: [
          {
            internalType: "bytes32",
            name: "streamsHash",
            type: "bytes32"
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "accountId",
                type: "uint256"
              },
              {
                internalType: "StreamConfig",
                name: "config",
                type: "uint256"
              }
            ],
            internalType: "struct StreamReceiver[]",
            name: "receivers",
            type: "tuple[]"
          },
          { internalType: "uint32", name: "updateTime", type: "uint32" },
          { internalType: "uint32", name: "maxEnd", type: "uint32" }
        ],
        internalType: "struct StreamsHistory[]",
        name: "streamsHistory",
        type: "tuple[]"
      }
    ],
    name: "squeezeStreamsResult",
    outputs: [{ internalType: "uint128", name: "amt", type: "uint128" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "accountId", type: "uint256" },
      { internalType: "contract IERC20", name: "erc20", type: "address" }
    ],
    name: "streamsState",
    outputs: [
      { internalType: "bytes32", name: "streamsHash", type: "bytes32" },
      {
        internalType: "bytes32",
        name: "streamsHistoryHash",
        type: "bytes32"
      },
      { internalType: "uint32", name: "updateTime", type: "uint32" },
      { internalType: "uint128", name: "balance", type: "uint128" },
      { internalType: "uint32", name: "maxEnd", type: "uint32" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint32", name: "driverId", type: "uint32" },
      { internalType: "address", name: "newDriverAddr", type: "address" }
    ],
    name: "updateDriverAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address"
      }
    ],
    name: "upgradeTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newImplementation",
        type: "address"
      },
      { internalType: "bytes", name: "data", type: "bytes" }
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "contract IERC20", name: "erc20", type: "address" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "amt", type: "uint256" }
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

// src/internal/abis/nativeTokenUnwrapperAbi.ts
var nativeTokenUnwrapperAbi = [
  {
    inputs: [
      {
        internalType: "contract IWrappedNativeToken",
        name: "wrappedNativeToken_",
        type: "address"
      }
    ],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    name: "Unwrapped",
    type: "event"
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "recipient",
        type: "address"
      }
    ],
    name: "unwrap",
    outputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "wrappedNativeToken",
    outputs: [
      {
        internalType: "contract IWrappedNativeToken",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    stateMutability: "payable",
    type: "receive"
  }
];

// src/internal/collect/prepareCollection.ts
var MAX_CYCLES = 1e3;
async function prepareCollection(adapter, config) {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  const {
    accountId,
    squeezeArgs,
    tokenAddresses,
    shouldSkipSplit,
    shouldSkipReceive,
    shouldAutoUnwrap,
    transferToAddress,
    batchedTxOverrides,
    currentReceivers: rawCurrentReceivers
  } = config;
  const { drips, caller, addressDriver, nativeTokenUnwrapper } = contractsRegistry[chainId];
  const signerAddress = await adapter.getAddress();
  if (tokenAddresses?.length === 0) {
    throw new DripsError("No tokens provided for collection.", {
      meta: { operation: prepareCollection.name, tokenAddresses }
    });
  }
  const txs = [];
  for (const tokenAddress of tokenAddresses) {
    const filteredArgs = (squeezeArgs || []).filter(
      (a) => a.tokenAddress === tokenAddress
    );
    for (const args of filteredArgs) {
      const squeezeTx = buildTx({
        abi: dripsAbi,
        functionName: "squeezeStreams",
        args: [
          accountId,
          tokenAddress,
          args.senderId,
          args.historyHash,
          args.streamsHistory
        ],
        contract: drips.address
      });
      txs.push(squeezeTx);
    }
    if (!shouldSkipReceive) {
      const receiveTx = buildTx({
        abi: dripsAbi,
        functionName: "receiveStreams",
        args: [accountId, tokenAddress, MAX_CYCLES],
        contract: drips.address
      });
      txs.push(receiveTx);
    }
    if (!shouldSkipSplit) {
      const { onChain: currentReceivers } = await parseSplitsReceivers(
        adapter,
        rawCurrentReceivers
      );
      const splitTx = buildTx({
        abi: dripsAbi,
        functionName: "split",
        args: [accountId, tokenAddress, currentReceivers],
        contract: drips.address
      });
      txs.push(splitTx);
    }
    if (shouldAutoUnwrap) {
      const nativeTokenUnwrapperAddress = nativeTokenUnwrapper.address;
      if (!nativeTokenUnwrapperAddress) {
        throw new DripsError(
          "Native token unwrapper is not configured for this chain but auto unwrap is enabled.",
          {
            meta: { operation: prepareCollection.name, chainId }
          }
        );
      }
      if (transferToAddress && transferToAddress !== signerAddress) {
        throw new DripsError(
          "Signer address and transfer to address must match when auto unwrapping.",
          {
            meta: {
              operation: prepareCollection.name,
              transferToAddress,
              signerAddress
            }
          }
        );
      }
      const collectTx = buildTx({
        abi: addressDriverAbi,
        functionName: "collect",
        args: [tokenAddress, nativeTokenUnwrapperAddress],
        contract: addressDriver.address
      });
      const unwrapTx = buildTx({
        abi: nativeTokenUnwrapperAbi,
        functionName: "unwrap",
        args: [signerAddress],
        contract: nativeTokenUnwrapper.address
      });
      txs.push(collectTx, unwrapTx);
    } else {
      const collectTx = buildTx({
        abi: addressDriverAbi,
        functionName: "collect",
        args: [tokenAddress, transferToAddress ?? signerAddress],
        contract: addressDriver.address
      });
      txs.push(collectTx);
    }
  }
  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: "callBatched",
    args: [txs.map(convertToCallerCall)],
    batchedTxOverrides
  });
  return preparedTx;
}

// src/internal/collect/collect.ts
async function collect(adapter, config) {
  const preparedTx = await prepareCollection(adapter, config);
  return adapter.sendTx(preparedTx);
}
var GET_USER_WITHDRAWABLE_BALANCES_QUERY = gql`
  query GetUserByAddress($address: String!, $chains: [SupportedChain!]) {
    userByAddress(address: $address, chains: $chains) {
      chainData {
        withdrawableBalances {
          tokenAddress
          collectableAmount
          receivableAmount
          splittableAmount
        }
      }
    }
  }
`;
async function getUserWithdrawableBalances(address, chainId, graphqlClient) {
  requireGraphQLSupportedChain(chainId, getUserWithdrawableBalances.name);
  const chain = graphqlChainMap[chainId];
  const variables = {
    chains: [chain],
    address
  };
  const client = graphqlClient || createGraphQLClient();
  const res = await client.query(
    GET_USER_WITHDRAWABLE_BALANCES_QUERY,
    variables
  );
  return res.userByAddress.chainData;
}

// src/sdk/createFundsModule.ts
function createFundsModule(deps) {
  const { adapter, graphqlClient } = deps;
  return {
    getWithdrawableBalances: async (chainId) => {
      requireWriteAccess(adapter, "getWithdrawableBalances");
      return getUserWithdrawableBalances(
        await adapter.getAddress(),
        chainId,
        graphqlClient
      );
    },
    prepareCollection: (config) => {
      requireWriteAccess(adapter, prepareCollection.name);
      return prepareCollection(adapter, config);
    },
    collect: (config) => {
      requireWriteAccess(adapter, collect.name);
      return collect(adapter, config);
    }
  };
}

// src/sdk/createDripsSdk.ts
function createDripsSdk(blockchainClient, ipfsMetadataUploaderFn, options) {
  const adapter = resolveBlockchainAdapter(blockchainClient);
  const graphqlClient = createGraphQLClient(
    options?.graphql?.url || DEFAULT_GRAPHQL_URL,
    options?.graphql?.apiKey
  );
  const deps = {
    adapter,
    graphqlClient,
    ipfsMetadataUploaderFn
  };
  return {
    constants: dripsConstants,
    utils: createUtilsModule({ adapter }),
    dripLists: createDripListsModule(deps),
    donations: createDonationsModule(deps),
    funds: createFundsModule({ adapter, graphqlClient }),
    linkedIdentities: createLinkedIdentitiesModule({ adapter })
  };
}
function toJsonSafe(value) {
  return JSON.parse(
    JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v)
  );
}
var parsers = {
  nft: nftDriverAccountMetadataParser,
  repo: repoDriverAccountMetadataParser,
  "immutable-splits": immutableSplitsDriverMetadataParser,
  address: addressDriverAccountMetadataParser
};
function getMetadataParser(metadata) {
  let parser;
  if ("describes" in metadata) {
    parser = parsers[metadata.describes.driver];
  } else if ("driver" in metadata) {
    parser = parsers[metadata.driver];
  }
  if (!parser) {
    throw new DripsError("Unsupported metadata driver", {
      meta: {
        operation: getMetadataParser.name,
        metadata
      }
    });
  }
  return parser;
}
function createIpfsMetadataUploader(client) {
  return async (metadata) => {
    try {
      getMetadataParser(metadata);
      const { cid } = await client.uploadJson(metadata);
      return cid;
    } catch (err) {
      throw new DripsError("IPFS upload failed", {
        cause: err,
        meta: {
          operation: createIpfsMetadataUploader.name,
          metadata
        }
      });
    }
  };
}
function createPinataIpfsMetadataUploader({
  pinataJwt,
  pinataGateway
}) {
  const pinata = new PinataSDK({
    pinataJwt,
    pinataGateway
  });
  const client = {
    uploadJson: async (data) => {
      const jsonSafeData = toJsonSafe(data);
      const { cid } = await pinata.upload.public.json(jsonSafeData);
      return { cid };
    }
  };
  return createIpfsMetadataUploader(client);
}

// src/index.ts
var utils = {
  buildTx,
  calcAddressId,
  calcProjectId,
  calcOrcidAccountId,
  calcDripListId,
  encodeStreamConfig,
  decodeStreamConfig,
  resolveDriverName,
  resolveAddressFromAddressDriverId
};
var dripsConstants = {
  MAX_SPLITS_RECEIVERS,
  TOTAL_SPLITS_WEIGHT,
  MAX_STREAMS_RECEIVERS,
  AMT_PER_SEC_MULTIPLIER,
  AMT_PER_SEC_EXTRA_DECIMALS,
  CYCLE_SECS
};

export { TimeUnit, claimOrcid, collect, contractsRegistry, createDripList, createDripsSdk, createPinataIpfsMetadataUploader, createViemReadAdapter, createViemWriteAdapter, dripsConstants, getDripListById, getUserWithdrawableBalances, prepareCollection, prepareContinuousDonation, prepareDripListCreation, prepareDripListUpdate, prepareOneTimeDonation, sendContinuousDonation, sendOneTimeDonation, updateDripList, utils, waitForOrcidOwnership };
