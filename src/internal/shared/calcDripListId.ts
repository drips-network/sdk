import {Address, decodeFunctionResult} from 'viem';
import {nftDriverAbi} from '../abis/nftDriverAbi';
import {buildTx} from '../shared/buildTx';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from '../shared/assertions';

/**
 * Calculates the Drip List ID (token ID) for a given `minter` and `salt`.
 *
 * This allows the caller to precompute the ID of a Drip List before it is actually minted.
 *
 * @param adapter - A read-only blockchain adapter used to interact with the chain.
 * @param params - The parameters required to calculate the Drip List ID.
 * @param params.salt - A salt value used to ensure uniqueness in the token ID derivation.
 * @param params.minter - The address of the account that would mint the Drip List.
 *
 * @returns A `bigint` representing the calculated Drip List ID.
 *
 * @throws {DripsError} If the chain is not supported.
 */
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
