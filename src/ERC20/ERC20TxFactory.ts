/* eslint-disable no-dupe-class-members */
import type { PromiseOrValue } from 'contracts/common';
import type { PopulatedTransaction, BigNumberish, Signer } from 'ethers';
import { safeDripsTx } from '../common/internals';
import Utils from '../utils';
import type { IERC20 } from '../../contracts';
import { IERC20__factory } from '../../contracts/factories';
import { validateClientSigner } from '../common/validators';

interface IERC20TxFactory extends Pick<IERC20['populateTransaction'], 'approve'> {}

/**
 * A factory for creating `IERC20` contract transactions.
 */
export default class ERC20TxFactory implements IERC20TxFactory {
	#erc20!: IERC20;
	#tokenAddress!: string;

	public get tokenAddress(): string {
		return this.#tokenAddress;
	}

	public static async create(singer: Signer, tokenAddress: string): Promise<ERC20TxFactory> {
		await validateClientSigner(singer, Utils.Network.SUPPORTED_CHAINS);

		const client = new ERC20TxFactory();

		client.#tokenAddress = tokenAddress;

		client.#erc20 = IERC20__factory.connect(tokenAddress, singer);

		return client;
	}

	async approve(spender: PromiseOrValue<string>, amount: PromiseOrValue<BigNumberish>): Promise<PopulatedTransaction> {
		return safeDripsTx(await this.#erc20.populateTransaction.approve(spender, amount));
	}
}
