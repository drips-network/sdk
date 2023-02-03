/* eslint-disable no-await-in-loop */

import type { SqueezedDripsEvent } from 'src/DripsSubgraph/types';
import Utils from '../../utils';
import { DripsErrors } from '../../common/DripsError';
import AccountService from '../AccountService';
import type { IAccountService } from '../AccountService';
import type { Account } from '../common/types';
import type { IEstimatorEngine } from './EstimatorEngine';
import EstimatorEngine from './EstimatorEngine';
import type { AccountEstimate } from './types';

const defaultDependencyFactory = (chainId: number): [AccountService, EstimatorEngine] => [
	new AccountService(chainId),
	new EstimatorEngine()
];

export default class AccountEstimator {
	#accountService!: IAccountService;
	#estimatorEngine!: IEstimatorEngine;

	public get userId(): string {
		return this.#userId;
	}
	#userId!: string;

	public get chainId(): number {
		return this.#chainId;
	}
	#chainId!: number;

	public get account(): Account | undefined {
		return this.#account;
	}
	#account!: Account;

	private constructor() {}

	public static async create(
		userId: string,
		chainId: number,
		dependencyFactory: (chainId: number) => [AccountService, EstimatorEngine] = defaultDependencyFactory
	): Promise<AccountEstimator> {
		if (!userId) {
			throw DripsErrors.clientInitializationError(`Could not create 'Estimator': user ID is required.`);
		}

		if (!chainId) {
			throw DripsErrors.clientInitializationError(`Could not create 'Estimator': chain ID is required.`);
		}

		const estimator = new AccountEstimator();
		const [accountService, estimatorEngine] = dependencyFactory(chainId);
		estimator.#accountService = accountService;
		estimator.#estimatorEngine = estimatorEngine;

		await estimator.refreshAccount();

		return estimator;
	}

	public async refreshAccount(): Promise<void> {
		this.#account = await this.#accountService.fetchAccount(this.#userId, this.#chainId);
	}

	public async estimate(excludingSqueezes?: SqueezedDripsEvent[]): Promise<AccountEstimate> {
		const currentCycle = Utils.Cycle.getInfo(this.chainId);

		return this.#estimatorEngine.estimateAccount(this.#account, currentCycle, excludingSqueezes);
	}
}
