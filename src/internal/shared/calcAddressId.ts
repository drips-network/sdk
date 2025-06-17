import {Address, decodeFunctionResult} from 'viem';
import {buildTx} from './buildTx';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from './assertions';
import {addressDriverAbi} from '../abis/addressDriverAbi';

export async function calcAddressId(
  adapter: ReadBlockchainAdapter,
  address: Address,
): Promise<bigint> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  const contract = contractsRegistry[chainId].addressDriver.address;

  const calcAccountIdTx = buildTx({
    abi: addressDriverAbi,
    contract,
    functionName: 'calcAccountId',
    args: [address],
  });

  const encodedResult = await adapter.call(calcAccountIdTx);

  const accountId = decodeFunctionResult({
    abi: addressDriverAbi,
    functionName: 'calcAccountId',
    data: encodedResult,
  });

  return accountId;
}
