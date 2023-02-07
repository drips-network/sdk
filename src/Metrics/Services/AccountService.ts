import Utils from '../../utils';
import constants from '../../constants';
import DripsSetEventService from './DripsSetEventService';
import type { Account, AssetConfig, AssetConfigHistoryItem, DripsSetEventWithFullReceivers, Stream } from '../types';

export default class AccountService {
	private readonly _dripsSetEventService: DripsSetEventService;

	public readonly chainId: number;

	public constructor(chainId: number);
	public constructor(chainId: number, dripsSetEventService?: DripsSetEventService);
	public constructor(chainId: number, dripsSetEventService: DripsSetEventService = new DripsSetEventService(chainId)) {
		if (chainId !== dripsSetEventService.chainId) {
			throw new Error(`Chain ID mismatch: ${chainId} !== ${dripsSetEventService.chainId}`);
		}

		this.chainId = chainId;
		this._dripsSetEventService = dripsSetEventService || new DripsSetEventService(chainId);
	}

	public async fetchAccount(userId: string): Promise<Account> {
		try {
			if (!userId) {
				throw new Error(`Could not fetch account: user ID is required.`);
			}

			const dripsSetEvents = await this._dripsSetEventService.getAllDripsSetEventsByUserId(userId);
			const dripsSetEventsWithFullReceivers = DripsSetEventService.reconcileDripsSetReceivers(dripsSetEvents);
			const dripsSetEventsByTokenAddress = DripsSetEventService.groupByTokenAddress(dripsSetEventsWithFullReceivers);
			const assetConfigs = this._buildAssetConfigsForUser(userId, dripsSetEventsByTokenAddress) || [];

			return {
				userId,
				assetConfigs
			};
		} catch (error: any) {
			throw new Error(`Could not fetch account: ${error.message}`);
		}
	}

	private _buildAssetConfigsForUser(
		userId: string,
		dripsSetEvents: { [tokenAddress: string]: DripsSetEventWithFullReceivers[] }
	): AssetConfig[] {
		return Object.entries(dripsSetEvents).reduce<AssetConfig[]>((acc, [tokenAddress, assetConfigDripsSetEvents]) => {
			if (!(assetConfigDripsSetEvents && assetConfigDripsSetEvents.length > 0)) {
				throw new Error(`Unable to find dripsSet events for asset config with token address ${tokenAddress}`);
			}

			const assetConfigHistoryItems: AssetConfigHistoryItem[] = [];

			assetConfigDripsSetEvents.forEach((dripsSetEvent) => {
				const assetConfigHistoryItemStreams: Stream[] = [];

				dripsSetEvent.currentReceivers.forEach((dripsReceiverSeenEvent) => {
					const dripsConfig = Utils.DripsReceiverConfiguration.fromUint256(dripsReceiverSeenEvent.config);

					const streamId = Utils.Stream.makeStreamId(userId, tokenAddress, dripsConfig.dripId.toString());

					assetConfigHistoryItemStreams.push({
						id: streamId,
						dripsConfig,
						receiverId: dripsReceiverSeenEvent.receiverUserId.toString(),
						senderId: userId
					});
				});

				let runsOutOfFunds: Date | undefined;

				// If `maxEnd` is the largest possible timestamp, all current streams end before balance is depleted.
				if (dripsSetEvent.maxEnd === 2n ** 32n - 1n) {
					runsOutOfFunds = undefined;
				} else if (dripsSetEvent.maxEnd === 0n) {
					runsOutOfFunds = undefined;
				} else {
					runsOutOfFunds = new Date(Number(dripsSetEvent.maxEnd) * 1000);
				}

				assetConfigHistoryItems.push({
					timestamp: new Date(Number(dripsSetEvent.blockTimestamp) * 1000),
					balance: dripsSetEvent.balance * BigInt(constants.AMT_PER_SEC_MULTIPLIER),
					runsOutOfFunds,
					streams: assetConfigHistoryItemStreams,
					historyHash: dripsSetEvent.dripsHistoryHash,
					receiversHash: dripsSetEvent.receiversHash
				});
			});

			const currentStreams = assetConfigHistoryItems[assetConfigHistoryItems.length - 1].streams;

			acc.push({
				tokenAddress,
				streams: currentStreams,
				history: assetConfigHistoryItems
			});

			return acc;
		}, []);
	}
}
