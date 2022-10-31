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

export type ReceivableDrips = {
	/** The token address. */
	tokenAddress: string;

	/** The amount which would be received. */
	receivableAmt: bigint;

	/** The number of cycles which would still be receivable after the call. */
	receivableCycles: number;
};
