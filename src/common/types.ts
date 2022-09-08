import type { BigNumberish } from 'ethers';

export type DripsReceiverConfig = {
	/** The UNIX timestamp when dripping should start. Must be greater than or equal to `0`. If set to `0`, the smart contract will use the timestamp when drips are configured. */
	readonly start: BigNumberish;
	/** The duration (in seconds) of dripping. Must be greater than or equal to `0`. If set to `0`, the smart contract will drip until the balance runs out. */
	readonly duration: BigNumberish;
	/** The amount per second being dripped. Must be greater than `0`. */
	readonly amountPerSec: BigNumberish;
};
