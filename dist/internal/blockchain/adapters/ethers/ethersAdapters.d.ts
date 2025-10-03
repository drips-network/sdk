import { Provider, Signer } from 'ethers';
import { R as ReadBlockchainAdapter, W as WriteBlockchainAdapter } from '../../../../BlockchainAdapter-Dt3QuYIj.js';
import 'viem';

declare function createEthersReadAdapter(provider: Provider): ReadBlockchainAdapter;
declare function createEthersWriteAdapter(signer: Signer): WriteBlockchainAdapter;

export { createEthersReadAdapter, createEthersWriteAdapter };
