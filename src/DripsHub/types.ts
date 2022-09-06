import type { BigNumber } from 'ethers';

export type DripsState = {
	maxEnd: number;
	dripsHash: string;
	balance: BigNumber;
	updateTime: number;
	dripsHistoryHash: string;
};
