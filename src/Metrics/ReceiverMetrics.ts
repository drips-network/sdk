/* eslint-disable no-param-reassign */
/* eslint-disable no-dupe-class-members */

import type { SqueezedDripsEvent } from 'src/DripsSubgraph/types';
import Utils from '../utils';
import { minMax } from './internals';
import AccountEstimator from './AccountEstimator';
import DripsSetEventService from './Services/DripsSetEventService';
import SplitsSetEventService from './Services/SplitsSetEventService';
import type { Account, ActiveSupporters, TotalSupporters, UserId } from './types';

export default class ReceiverMetrics {
	private readonly _accountEstimator: AccountEstimator;
	private readonly _dripsSetEventService: DripsSetEventService;
	private readonly _splitSetEventService: SplitsSetEventService;

	private constructor(
		chainId: number,
		accountEstimator: AccountEstimator,
		dripsSetEventService: DripsSetEventService,
		splitsSetEventService: SplitsSetEventService
	) {
		this._accountEstimator = accountEstimator;
		this._dripsSetEventService = dripsSetEventService;
		this._splitSetEventService = splitsSetEventService;
	}

	public static async create(userId: UserId, chainId: number): Promise<ReceiverMetrics>;
	public static async create(
		userId: UserId,
		chainId: number,
		accountEstimator?: AccountEstimator,
		dripsSetEventService?: DripsSetEventService,
		splitsSetEventService?: SplitsSetEventService
	): Promise<ReceiverMetrics>;
	public static async create(
		userId: UserId,
		chainId: number,
		accountEstimator?: AccountEstimator,
		dripsSetEventService?: DripsSetEventService,
		splitsSetEventService?: SplitsSetEventService
	): Promise<ReceiverMetrics> {
		dripsSetEventService = dripsSetEventService || new DripsSetEventService(chainId);
		splitsSetEventService = splitsSetEventService || new SplitsSetEventService(chainId);
		accountEstimator = accountEstimator || (await AccountEstimator.create(userId, chainId));

		if (
			chainId !== accountEstimator.chainId ||
			chainId !== dripsSetEventService.chainId ||
			chainId !== splitsSetEventService.chainId
		) {
			throw new Error(`Could not create 'Metrics': all services must be initialized with the same chain ID.`);
		}

		const metrics = new ReceiverMetrics(chainId, accountEstimator, dripsSetEventService, splitsSetEventService);

		return metrics;
	}

	public async getActiveSupporters(userId: string): Promise<ActiveSupporters> {
		if (!userId) {
			throw new Error(`Could not get supporters: user ID is required.`);
		}

		try {
			const activeSupporters: ActiveSupporters = { dripping: {}, splitting: [] };

			const dripsSetEvents = await this._dripsSetEventService.getAllDripsSetEventsByReceiverUserId(userId);
			const dripsSetEventsByUserAndToken = DripsSetEventService.groupByUserAndTokenAddress(dripsSetEvents);

			Object.entries(dripsSetEventsByUserAndToken).forEach(([senderId, dripsSetEventsByToken]) => {
				Object.entries(dripsSetEventsByToken).forEach(([tokenAddress, tokenDripsSetEvents]) => {
					if (tokenDripsSetEvents.length === 0) {
						return;
					}

					const sorted = DripsSetEventService.sortByBlockTimestampASC(tokenDripsSetEvents);
					const mostRecentDripsSetEvent = sorted[sorted.length - 1];

					const latestReceiverConfig = Utils.DripsReceiverConfiguration.fromUint256(
						mostRecentDripsSetEvent.dripsReceiverSeenEvents.filter(
							(dripsReceiverSeenEvent) => dripsReceiverSeenEvent.receiverUserId === userId
						)[0].config
					);

					const isActive =
						minMax(
							'min',
							Number(mostRecentDripsSetEvent.maxEnd),
							Number(latestReceiverConfig.start) + Number(latestReceiverConfig.duration)
						) > BigInt(Date.now());

					if (isActive) {
						activeSupporters.dripping[senderId][tokenAddress].push(latestReceiverConfig);
					}
				});
			});

			const splitsEntries = await this._splitSetEventService.getAllSplitEntriesByReceiverUserId(userId);

			splitsEntries.forEach((splitEntry) => {
				activeSupporters.splitting.push({ weight: splitEntry.weight });
			});

			return activeSupporters;
		} catch (error: any) {
			throw new Error(`Failed to get active supporters for user ${userId}: ${error.message}`);
		}
	}

	public async getTotalSupporters(userId: string): Promise<TotalSupporters> {
		if (!userId) {
			throw new Error(`Could not get supporters: user ID is required.`);
		}

		try {
			const totalSupporters: TotalSupporters = { dripping: {}, splitting: [] };

			const dripsSetEvents = await this._dripsSetEventService.getAllDripsSetEventsByReceiverUserId(userId);
			const dripsSetEventsByUserAndToken = DripsSetEventService.groupByTokenAddress(dripsSetEvents);

			Object.entries(dripsSetEventsByUserAndToken).forEach(([tokenAddress, tokenDripsSetEvents]) => {
				const userIds = new Set<UserId>();

				tokenDripsSetEvents.forEach((dripsSetEvent) => {
					userIds.add(dripsSetEvent.userId);
				});

				totalSupporters.dripping[tokenAddress] = userIds;
			});

			const splitsEntries = await this._splitSetEventService.getAllSplitEntriesByReceiverUserId(userId);

			splitsEntries.forEach((splitEntry) => {
				totalSupporters.splitting.push({ weight: splitEntry.weight });
			});

			return totalSupporters;
		} catch (error: any) {
			throw new Error(`Failed to get total supporters for user ${userId}: ${error.message}`);
		}
	}

	public async getIncomingStreamsValue(account: Account, excludingSqueezes?: SqueezedDripsEvent[]): Promise<any> {
		const estimate = await this._accountEstimator.estimate(excludingSqueezes);

		Object.entries(estimate).forEach(([tokenAddress, tokenEstimates]) => {
			const { currentCycle, total } = tokenEstimates;
		});
	}

	getTotalValueRaised(): Promise<bigint> {
		throw new Error('Method not implemented.');
	}

	getIncomingSplitsValue(): Promise<bigint> {
		throw new Error('Method not implemented.');
	}
}
