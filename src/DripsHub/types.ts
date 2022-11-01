export type DripsState = {
	/** The current drips receivers list hash. */
	dripsHash: string;
	/** The current drips history hash. */
	dripsHistoryHash: string;
	/** The time when drips have been configured for the last time. */
	updateTime: number;
	/** The balance when drips have been configured for the last time. */
	balance: bigint;
	/** The current maximum end time of drips. */
	maxEnd: number;
};

export type ReceivableBalance = {
	/** The token address. */
	tokenAddress: string;

	/** The amount which would be received. */
	receivableAmount: bigint;

	/** The number of cycles that would still be receivable after `receivableAmount` is received. */
	remainingReceivableCycles: number;
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

export type AssetId = bigint;
