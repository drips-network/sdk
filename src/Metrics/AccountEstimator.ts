/* eslint-disable no-dupe-class-members */
import type { SqueezedDripsEvent } from 'src/DripsSubgraph/types';
import Utils from '../utils';
import { DripsErrors } from '../common/DripsError';
import AccountService from './Services/AccountService';
import type { Account, AccountEstimate, UserId } from './types';
import EstimatorService from './Services/EstimatorService';

export default class AccountEstimator {
	private readonly _accountService: AccountService;
	private readonly _estimatorEngine: EstimatorService;

	public readonly userId: string;
	public readonly chainId: number;

	public account: Account;

	private constructor(
		userId: UserId,
		chainId: number,
		account: Account,
		accountService: AccountService,
		estimatorService: EstimatorService
	) {
		this.userId = userId;
		this.chainId = chainId;
		this.account = account;
		this._accountService = accountService;
		this._estimatorEngine = estimatorService;
	}

	public static async create(userId: string, chainId: number): Promise<AccountEstimator>;
	public static async create(
		userId: string,
		chainId: number,
		accountService?: AccountService,
		estimatorService?: EstimatorService
	): Promise<AccountEstimator>;
	public static async create(
		userId: string,
		chainId: number,
		accountService: AccountService = new AccountService(chainId),
		estimatorService: EstimatorService = new EstimatorService()
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

		const account = await accountService.fetchAccount(userId);
		const estimator = new AccountEstimator(userId, chainId, account, accountService, estimatorService);

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
