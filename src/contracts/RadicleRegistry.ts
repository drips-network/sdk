export default [
  {
    "inputs": [
      {
        "internalType": "contract IBuilder",
        "name": "builder_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "contract IBuilder",
        "name": "builder",
        "type": "address"
      }
    ],
    "name": "NewBuilder",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "dripTokenTemplate",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "fundingToken",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "projectOwner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      }
    ],
    "name": "NewProject",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "template",
        "type": "address"
      }
    ],
    "name": "NewTemplate",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "builder",
    "outputs": [
      {
        "internalType": "contract IBuilder",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IBuilder",
        "name": "newBuilder",
        "type": "address"
      }
    ],
    "name": "changeBuilder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newTemplate",
        "type": "address"
      }
    ],
    "name": "changeTemplate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "dripsToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dripsTokenTemplate",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "projectOwner",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "contractURI",
        "type": "string"
      },
      {
        "components": [
          {
            "internalType": "uint128",
            "name": "nftTypeId",
            "type": "uint128"
          },
          {
            "internalType": "uint64",
            "name": "limit",
            "type": "uint64"
          },
          {
            "internalType": "uint128",
            "name": "minAmt",
            "type": "uint128"
          },
          {
            "internalType": "bool",
            "name": "streaming",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "ipfsHash",
            "type": "string"
          }
        ],
        "internalType": "struct InputType[]",
        "name": "inputTypes",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          },
          {
            "internalType": "uint32",
            "name": "weight",
            "type": "uint32"
          }
        ],
        "internalType": "struct SplitsReceiver[]",
        "name": "splits",
        "type": "tuple[]"
      }
    ],
    "name": "newProject",
    "outputs": [
      {
        "internalType": "address",
        "name": "fundingToken",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
