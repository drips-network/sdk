import Utils from '../utils';
import { minMax } from './internals';
import DripsSetEventService from './Services/DripsSetEventService';
import SplitsSetEventService from './Services/SplitsSetEventService';
import type { ActiveSupporters, TotalSupporters, UserId } from './types';

export default class Metrics {
	private readonly _dripsSetEventService: DripsSetEventService;
	private readonly _splitSetEventService: SplitsSetEventService;

	constructor(chainId: number);
	public constructor(
		chainId: number,
		dripsSetEventService?: DripsSetEventService,
		splitsSetEventService?: SplitsSetEventService
	);
	public constructor(
		chainId: number,
		dripsSetEventService: DripsSetEventService = new DripsSetEventService(chainId),
		splitsSetEventService: SplitsSetEventService = new SplitsSetEventService(chainId)
	) {
		if (chainId !== dripsSetEventService.chainId || chainId !== splitsSetEventService.chainId) {
			throw new Error(
				`Chain ID mismatch: ${chainId} !== ${dripsSetEventService.chainId} !== ${splitsSetEventService.chainId}`
			);
		}

		this._dripsSetEventService = dripsSetEventService;
		this._splitSetEventService = splitsSetEventService;
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

	getIncomingStreamsValue(): Promise<any> {
		throw new Error('Method not implemented.');
	}

	getTotalValueRaised(): Promise<bigint> {
		throw new Error('Method not implemented.');
	}

	getIncomingSplitsValue(): Promise<bigint> {
		throw new Error('Method not implemented.');
	}
}
