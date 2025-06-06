import {Address, decodeFunctionResult} from 'viem';
import {nftDriverAbi} from '../abis/nftDriverAbi';
import {buildTx} from '../utils/buildTx';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from '../utils/assertions';

export async function calcDripListId(
  adapter: ReadBlockchainAdapter,
  params: {
    salt: bigint;
    minter: Address;
  },
): Promise<bigint> {
  const chainId = await adapter.getChainId();
  const {minter, salt} = params;
  requireSupportedChain(chainId);
  const contract = contractsRegistry[chainId].nftDriver.address;

  const calcTokenIdWithSaltTx = buildTx({
    abi: nftDriverAbi,
    contract,
    functionName: 'calcTokenIdWithSalt',
    args: [minter, salt],
  });

  const encodedResult = await adapter.call(calcTokenIdWithSaltTx);

  const dripListId = decodeFunctionResult({
    abi: nftDriverAbi,
    functionName: 'calcTokenIdWithSalt',
    data: encodedResult,
  });

  return dripListId;
}
