import type { BigNumberish } from 'ethers';
import { BigNumber } from 'ethers';
import { DripsErrors } from './DripsError';

export default class DripsReceiverConfig {
	#start!: BigNumberish;
	/** The UNIX timestamp when dripping should start. If set to zero, the smart contract will use the timestamp when drips are configured. */
	public get start(): BigNumberish {
		return this.#start;
	}

	#asUint256!: BigNumberish;
	/** The drips configuration encoded as a `uint256`. */
	public get asUint256(): BigNumberish {
		return this.#asUint256;
	}

	#duration!: BigNumberish;
	/** The duration (in seconds) of dripping. If set to zero, the smart contract will drip until the balance runs out. */
	public get duration(): BigNumberish {
		return this.#duration;
	}

	#amountPerSec!: BigNumberish;
	/** The amount per second being dripped. Must never be zero. */
	public get amountPerSec(): BigNumberish {
		return this.#amountPerSec;
	}

	private constructor() {}

	/** Creates a new drips configuration.
	 * @param  {BigNumberish} amountPerSec The amount per second being dripped. Must never be zero.
	 * @param  {BigNumberish} start The UNIX timestamp when dripping should start. If set to zero (default value), the smart contract will use the timestamp when drips are configured.
	 * @param  {BigNumberish} duration The duration of dripping. If set to zero, the smart contract will drip until balance runs out.
	 * @returns The drips configuration.
	 */
	public static create(
		amountPerSec: BigNumberish,
		duration: BigNumberish,
		start: BigNumberish = 0
	): DripsReceiverConfig {
		if (amountPerSec === 0) {
			throw DripsErrors.invalidArgument(`Could not create a new DripsReceiverConfig: amountPerSec cannot be 0.`);
		}

		const config = new DripsReceiverConfig();

		config.#start = start;
		config.#duration = duration;
		config.#amountPerSec = amountPerSec;
		config.#asUint256 = DripsReceiverConfig.toUint256(config);

		return config;
	}

	// TODO: Implement
	public toJsonString(): string {
		// https://stackoverflow.com/questions/40080473/using-json-stringify-in-conjunction-with-typescript-getter-setter
		throw new Error('Not implemented');
	}

	/**
	 * Converts a `uint256` to a {@link DripsReceiverConfig} object.
	 * @param  {BigNumberish} dripsConfig The drips configuration as a `uint256`.
	 * @returns The drips configuration.
	 */
	public static fromUint256(dripsConfig: BigNumberish): DripsReceiverConfig {
		const config = BigNumber.from(dripsConfig);

		const amountPerSec = config.shr(64);
		const duration = config.and(2 ** 32 - 1);
		const start = config.shr(32).and(2 ** 32 - 1);

		return DripsReceiverConfig.create(amountPerSec, duration, start);
	}

	/**
	 * Encodes the drips configuration as a `uint256`.
	 *
	 * @param  {DripsReceiverConfig} config The drips configuration.
	 */
	public static toUint256 = (config: DripsReceiverConfig) => {
		const start = BigNumber.from(config.start);
		const duration = BigNumber.from(config.duration);
		const amountPerSec = BigNumber.from(config.amountPerSec);

		let configAsUint256 = amountPerSec;
		configAsUint256 = configAsUint256.shl(32);
		configAsUint256 = configAsUint256.or(start);
		configAsUint256 = configAsUint256.shl(32);
		configAsUint256 = configAsUint256.or(duration);

		return configAsUint256;
	};
}
