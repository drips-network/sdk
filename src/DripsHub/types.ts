import type { BigNumber } from 'ethers';

export type DripsState = {
	/** The current drips receivers list hash. */
	dripsHash: string;
	/** The current drips history hash. */
	dripsHistoryHash: string;
	/** The time when drips have been configured for the last time. */
	updateTime: number;
	/** The balance when drips have been configured for the last time. */
	balance: BigNumber;
	/** The current maximum end time of drips. */
	maxEnd: number;
};

export type DripsHubClientConstants = {
	MAX_TOTAL_BALANCE: BigNumber;
	TOTAL_SPLITS_WEIGHT: number;
	MAX_DRIPS_RECEIVERS: number;
	MAX_SPLITS_RECEIVERS: number;
	AMT_PER_SEC_MULTIPLIER: BigNumber;
	AMT_PER_SEC_EXTRA_DECIMALS: number;
};
