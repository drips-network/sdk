/* eslint-disable no-dupe-class-members */
import type { SqueezedDripsEvent } from 'src/DripsSubgraph/types';
import Utils from '../utils';
import { DripsErrors } from '../common/DripsError';
import AccountService from './Services/AccountService';
import type { Account, AccountEstimate, UserId } from './types';
import EstimatorEngine from './Services/EstimatorEngine';

export default class AccountEstimator {
	private readonly _accountService: AccountService;
	private readonly _estimatorEngine: EstimatorEngine;

	public readonly userId: string;
	public readonly chainId: number;

	public account!: Account;

	private constructor(
		userId: UserId,
		chainId: number,
		accountService: AccountService,
		estimatorEngine: EstimatorEngine
	) {
		this.userId = userId;
		this.chainId = chainId;
		this._accountService = accountService;
		this._estimatorEngine = estimatorEngine;
	}

	public static async create(userId: string, chainId: number): Promise<AccountEstimator>;
	public static async create(
		userId: string,
		chainId: number,
		accountService?: AccountService,
		estimatorEngine?: EstimatorEngine
	): Promise<AccountEstimator>;
	public static async create(
		userId: string,
		chainId: number,
		accountService: AccountService = new AccountService(chainId),
		estimatorEngine: EstimatorEngine = new EstimatorEngine()
	): Promise<AccountEstimator> {
		if (chainId !== accountService.chainId) {
			throw new Error(`Chain ID mismatch: ${chainId} !== ${accountService.chainId}`);
		}

		if (!userId) {
			throw DripsErrors.clientInitializationError(`Could not create 'Estimator': user ID is required.`);
		}

		if (!chainId) {
			throw DripsErrors.clientInitializationError(`Could not create 'Estimator': chain ID is required.`);
		}

		const estimator = new AccountEstimator(userId, chainId, accountService, estimatorEngine);
		await estimator.refreshAccount();

		return estimator;
	}

	public async refreshAccount(): Promise<void> {
		this.account = await this._accountService.fetchAccount(this.userId);
	}

	public async estimate(excludingSqueezes?: SqueezedDripsEvent[]): Promise<AccountEstimate> {
		const currentCycle = Utils.Cycle.getInfo(this.chainId);

		return this._estimatorEngine.estimateAccount(this.account, currentCycle, excludingSqueezes);
	}
}
