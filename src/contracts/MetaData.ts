export default [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "addr",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "multiHash",
        "type": "bytes"
      }
    ],
    "name": "MultiHash",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "multiHash",
        "type": "bytes"
      }
    ],
    "name": "publish",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]