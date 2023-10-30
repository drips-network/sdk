export type StreamsState = {
	/** The current streams receivers list hash. */
	streamsHash: string;
	/** The current streams history hash. */
	streamsHistoryHash: string;
	/** The time when streams have been configured for the last time. */
	updateTime: number;
	/** The balance when streams have been configured for the last time. */
	balance: bigint;
	/** The current maximum end time of streams. */
	maxEnd: number;
};

export type ReceivableBalance = {
	/** The token address. */
	tokenAddress: string;

	/** The amount which would be received. */
	receivableAmount: bigint;
};

export type SplittableBalance = {
	/** The token address. */
	tokenAddress: string;

	/** The amount which would be splitted. */
	splittableAmount: bigint;
};

export type CollectableBalance = {
	/** The token address. */
	tokenAddress: string;

	/** The amount which would be collected. */
	collectableAmount: bigint;
};

export type SplitResult = {
	/** The amount made collectable for the user on top of what was collectable before. */
	collectableAmount: bigint;

	/** The amount split to the user's splits receivers. */
	splitAmount: bigint;
};

export type AssetId = bigint;
