export const immutableSplitsDriverAbi = [
  {
    inputs: [
      {internalType: 'contract Drips', name: '_drips', type: 'address'},
      {internalType: 'uint32', name: '_driverId', type: 'uint32'},
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'previousAdmin',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'newAdmin',
        type: 'address',
      },
    ],
    name: 'AdminChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'beacon',
        type: 'address',
      },
    ],
    name: 'BeaconUpgraded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'accountId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'receiversHash',
        type: 'bytes32',
      },
    ],
    name: 'CreatedSplits',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'currentAdmin',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newAdmin',
        type: 'address',
      },
    ],
    name: 'NewAdminProposed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'pauser',
        type: 'address',
      },
    ],
    name: 'Paused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'pauser',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'PauserGranted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'pauser',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
    ],
    name: 'PauserRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'pauser',
        type: 'address',
      },
    ],
    name: 'Unpaused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'implementation',
        type: 'address',
      },
    ],
    name: 'Upgraded',
    type: 'event',
  },
  {
    inputs: [],
    name: 'acceptAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'admin',
    outputs: [{internalType: 'address', name: '', type: 'address'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'allPausers',
    outputs: [
      {
        internalType: 'address[]',
        name: 'pausersList',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {internalType: 'uint256', name: 'accountId', type: 'uint256'},
          {internalType: 'uint32', name: 'weight', type: 'uint32'},
        ],
        internalType: 'struct SplitsReceiver[]',
        name: 'receivers',
        type: 'tuple[]',
      },
      {
        components: [
          {internalType: 'bytes32', name: 'key', type: 'bytes32'},
          {internalType: 'bytes', name: 'value', type: 'bytes'},
        ],
        internalType: 'struct AccountMetadata[]',
        name: 'accountMetadata',
        type: 'tuple[]',
      },
    ],
    name: 'createSplits',
    outputs: [{internalType: 'uint256', name: 'accountId', type: 'uint256'}],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'drips',
    outputs: [{internalType: 'contract Drips', name: '', type: 'address'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'driverId',
    outputs: [{internalType: 'uint32', name: '', type: 'uint32'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{internalType: 'address', name: 'pauser', type: 'address'}],
    name: 'grantPauser',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'implementation',
    outputs: [{internalType: 'address', name: '', type: 'address'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isPaused',
    outputs: [{internalType: 'bool', name: '', type: 'bool'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{internalType: 'address', name: 'pauser', type: 'address'}],
    name: 'isPauser',
    outputs: [{internalType: 'bool', name: 'isAddrPauser', type: 'bool'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextAccountId',
    outputs: [{internalType: 'uint256', name: 'accountId', type: 'uint256'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{internalType: 'address', name: 'newAdmin', type: 'address'}],
    name: 'proposeNewAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'proposedAdmin',
    outputs: [{internalType: 'address', name: '', type: 'address'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'proxiableUUID',
    outputs: [{internalType: 'bytes32', name: '', type: 'bytes32'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{internalType: 'address', name: 'pauser', type: 'address'}],
    name: 'revokePauser',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSplitsWeight',
    outputs: [{internalType: 'uint32', name: '', type: 'uint32'}],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newImplementation',
        type: 'address',
      },
    ],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newImplementation',
        type: 'address',
      },
      {internalType: 'bytes', name: 'data', type: 'bytes'},
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;
