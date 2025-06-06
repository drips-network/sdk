export const contractsRegistry = {
  1: {
    repoDriver: {
      address: '0x770023d55D09A9C110694827F1a6B32D5c2b373E',
    },
    nftDriver: {
      address: '0xcf9c49B0962EDb01Cdaa5326299ba85D72405258',
    },
    addressDriver: {
      address: '0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610',
    },
    drips: {
      address: '0xd0Dd053392db676D57317CD4fe96Fc2cCf42D0b4',
    },
    caller: {
      address: '0x60F25ac5F289Dc7F640f948521d486C964A248e5',
    },
  },
  80002: {
    repoDriver: {
      address: '0x54372850Db72915Fd9C5EC745683EB607b4a8642',
    },
    nftDriver: {
      address: '0xDafd9Ab96E62941808caa115D184D30A200FA777',
    },
    addressDriver: {
      address: '0x004310a6d47893Dd6e443cbE471c24aDA1e6c619',
    },
    drips: {
      address: '0xeebCd570e50fa31bcf6eF10f989429C87C3A6981',
    },
    caller: {
      address: '0x5C7c5AA20b15e13229771CB7De36Fe1F54238372',
    },
  },
  11155420: {
    repoDriver: {
      address: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
    },
    nftDriver: {
      address: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
    },
    addressDriver: {
      address: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
    },
    drips: {
      address: '0x74A32a38D945b9527524900429b083547DeB9bF4',
    },
    caller: {
      address: '0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee',
    },
  },
  11155111: {
    repoDriver: {
      address: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
    },
    nftDriver: {
      address: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
    },
    addressDriver: {
      address: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
    },
    drips: {
      address: '0x74A32a38D945b9527524900429b083547DeB9bF4',
    },
    caller: {
      address: '0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee',
    },
  },
  31337: {
    repoDriver: {
      address: '0x971e08fc533d2A5f228c7944E511611dA3B56B24',
    },
    nftDriver: {
      address: '0xf98e07d281Ff9b83612DBeF0A067d710716720eA',
    },
    addressDriver: {
      address: '0x1707De7b41A3915F990A663d27AD3a952D50151d',
    },
    drips: {
      address: '0x7CBbD3FdF9E5eb359E6D9B12848c5Faa81629944',
    },
    caller: {
      address: '0x2eac4218a453B1A52544Be315d2376B9A76614F1',
    },
  },
  84532: {
    repoDriver: {
      address: '0x54372850Db72915Fd9C5EC745683EB607b4a8642',
    },
    nftDriver: {
      address: '0xDafd9Ab96E62941808caa115D184D30A200FA777',
    },
    addressDriver: {
      address: '0x004310a6d47893Dd6e443cbE471c24aDA1e6c619',
    },
    drips: {
      address: '0xeebCd570e50fa31bcf6eF10f989429C87C3A6981',
    },
    caller: {
      address: '0x5C7c5AA20b15e13229771CB7De36Fe1F54238372',
    },
  },
  314: {
    repoDriver: {
      address: '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257',
    },
    nftDriver: {
      address: '0x2F23217A87cAf04ae586eed7a3d689f6C48498dB',
    },
    addressDriver: {
      address: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE',
    },
    drips: {
      address: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
    },
    caller: {
      address: '0xd6Ab8e72dE3742d45AdF108fAa112Cd232718828',
    },
  },
  1088: {
    repoDriver: {
      address: '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257',
    },
    nftDriver: {
      address: '0x2F23217A87cAf04ae586eed7a3d689f6C48498dB',
    },
    addressDriver: {
      address: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE',
    },
    drips: {
      address: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
    },
    caller: {
      address: '0xd6Ab8e72dE3742d45AdF108fAa112Cd232718828',
    },
  },
  10: {
    repoDriver: {
      address: '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257',
    },
    nftDriver: {
      address: '0x2F23217A87cAf04ae586eed7a3d689f6C48498dB',
    },
    addressDriver: {
      address: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE',
    },
    drips: {
      address: '0xd320F59F109c618b19707ea5C5F068020eA333B3',
    },
    caller: {
      address: '0xd6Ab8e72dE3742d45AdF108fAa112Cd232718828',
    },
  },
} as const;

export type SupportedChain = keyof typeof contractsRegistry;
