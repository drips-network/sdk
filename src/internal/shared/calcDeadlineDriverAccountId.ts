import {decodeFunctionResult} from 'viem';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {buildTx} from './buildTx';
import {requireSupportedChain} from './assertions';
import {contractsRegistry} from '../config/contractsRegistry';
import {repoDeadlineDriverAbi} from '../abis/repoDeadlineDriver';

export async function calcDeadlineDriverAccountId(
  adapter: ReadBlockchainAdapter,
  params: {
    repoAccountId: bigint;
    recipientAccountId: bigint;
    refundAccountId: bigint;
    deadlineSeconds: number;
  },
): Promise<bigint> {
  const chainId = await adapter.getChainId();
  const {repoAccountId, recipientAccountId, refundAccountId, deadlineSeconds} =
    params;
  requireSupportedChain(chainId);
  const contract = contractsRegistry[chainId].repoDeadlineDriver.address;

  const calcAccountIdTx = buildTx({
    abi: repoDeadlineDriverAbi,
    contract,
    functionName: 'calcAccountId',
    args: [repoAccountId, recipientAccountId, refundAccountId, deadlineSeconds],
  });

  const encodedResult = await adapter.call(calcAccountIdTx);

  const accountId = decodeFunctionResult({
    abi: repoDeadlineDriverAbi,
    functionName: 'calcAccountId',
    data: encodedResult,
  });

  return accountId;
}
