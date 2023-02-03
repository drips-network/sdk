import type { Supporter } from './types';

type Interval = 'second' | 'day' | 'week' | 'month';

export interface IReceiverStats {
	getActiveSupporters(): Promise<Supporter[]>;
	getTotalSupporters(): Promise<Supporter[]>;
	getIncomingStreamsValue(interval: Interval): Promise<any>;
	getTotalValueRaised(): Promise<bigint>;
	getIncomingSplitsValue(): Promise<bigint>;
}

export default class ReceiverStats implements IReceiverStats {
	#userId: string;
	public get userId() {
		return this.#userId;
	}

	constructor(userId: string) {
		this.#userId = userId;
	}

	getActiveSupporters(): Promise<Supporter[]> {
		throw new Error('Method not implemented.');
	}

	getTotalSupporters(): Promise<Supporter[]> {
		throw new Error('Method not implemented.');
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
