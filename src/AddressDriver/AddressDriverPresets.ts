import type { CallStruct } from 'contracts/Caller';
import type { BigNumberish, BytesLike } from 'ethers';
import { BigNumber } from 'ethers';
import { validateAddress, validateDripsReceivers, validateSplitsReceivers } from '../common/validators';
import { formatDripsReceivers, isNullOrUndefined, nameOf } from '../common/internals';
import Utils from '../utils';
import type { DripsReceiverStruct, Preset, SplitsReceiverStruct } from '../common/types';
import { DripsErrors } from '../common/DripsError';
import { AddressDriver__factory, DripsHub__factory } from '../../contracts/factories';

export namespace AddressDriverPresets {
	export type CreateStreamFlowPayload = {
		driverAddress: string;
		tokenAddress: string;
		currentReceivers: DripsReceiverStruct[];
		newReceivers: DripsReceiverStruct[];
		balanceDelta: BigNumberish;
		transferToAddress: string;
		key: BigNumberish;
		value: BytesLike;
	};

	export type CollectFlowPayload = {
		driverAddress: string;
		dripsHubAddress: string;
		userId: string;
		tokenAddress: string;
		maxCycles: BigNumberish;
		currentReceivers: SplitsReceiverStruct[];
		transferToAddress: string;
	};

	/**
 * Pre-configured sets of smart contract calls that can be used as input to `Caller.callBatched` method.
 * @see `CallerClient` for more.
 *
 *
 * @example <caption>Example usage of `collectFlow`.</caption>
 * // Create a new `Caller`.
 * const caller = await CallerClient.create(provider);
 *
 * // Populate the flow's payload.
	const flowPayload: AddressDriverPresets.CollectFlowPayload = {
		driverAddress,
		dripsHubAddress,
		userId,
		tokenAddress,
		maxCycles,
		currentReceivers,
		transferToAddress
	};

	// Create a new `collectFlow` preset.
	const collectFlow = AddressDriverPresets.Presets.collectFlow(flowPayload);

	// Pass the preset to the `Caller`.
	const tx = await caller.callBatched(collectFlow);
	await tx.wait();
	*/
	export class Presets {
		/**
		 * Creates a new batch with the following sequence of calls:
		 * 1. `setDrips`
		 * 2. `emitUserMetadata`
		 *
		 * @see `AddressDriverClient`'s API for more details.
		 * @param  {CreateStreamFlowPayload} payload the flow's payload.
		 * @returns The preset.
		 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
		 * @throws {DripsErrors.addressError} if `payload.tokenAddress` or `payload.transferToAddress` is not valid.
		 * @throws {DripsErrors.argumentError} if `payload.currentReceivers`' or `payload.newReceivers`' count exceeds the max allowed drips receivers.
		 * @throws {DripsErrors.dripsReceiverError} if any of the `payload.currentReceivers` or the `newReceivers` is not valid.
		 * @throws {DripsErrors.dripsReceiverConfigError} if any of the `payload.receivers`' configuration is not valid.
		 */
		public static createStreamFlow(payload: CreateStreamFlowPayload): Preset {
			if (isNullOrUndefined(payload)) {
				throw DripsErrors.argumentMissingError(
					`Could not create stream flow: '${nameOf({ payload })}' is missing.`,
					nameOf({ payload })
				);
			}

			const {
				key,
				value,
				tokenAddress,
				driverAddress,
				newReceivers,
				balanceDelta,
				currentReceivers,
				transferToAddress
			} = payload;

			validateAddress(tokenAddress);
			validateDripsReceivers(
				newReceivers.map((r) => ({
					userId: r.userId.toString(),
					config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
				}))
			);
			validateDripsReceivers(
				currentReceivers.map((r) => ({
					userId: r.userId.toString(),
					config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
				}))
			);
			if (isNullOrUndefined(transferToAddress)) {
				throw DripsErrors.argumentMissingError(
					`Could not create stream flow: '${nameOf({ transferToAddress })}' is missing.`,
					nameOf({ transferToAddress })
				);
			}
			if (isNullOrUndefined(key)) {
				throw DripsErrors.argumentMissingError(
					`Could not create stream flow: '${nameOf({ key })}' is missing.`,
					nameOf({ key })
				);
			}
			if (!value) {
				throw DripsErrors.argumentMissingError(
					`Could not create stream flow: '${nameOf({ value })}' is missing.`,
					nameOf({ value })
				);
			}

			const setDrips: CallStruct = {
				value: 0,
				to: driverAddress,
				data: AddressDriver__factory.createInterface().encodeFunctionData('setDrips', [
					tokenAddress,
					formatDripsReceivers(currentReceivers),
					balanceDelta,
					formatDripsReceivers(newReceivers),
					transferToAddress
				])
			};

			const emitUserMetadata: CallStruct = {
				value: 0,
				to: driverAddress,
				data: AddressDriver__factory.createInterface().encodeFunctionData('emitUserMetadata', [key, value])
			};

			return [setDrips, emitUserMetadata];
		}

		/**
		 * Creates a new batch with the following sequence of calls:
		 * 1. `receiveDrips`
		 * 2. `split`
		 * 3. `collect`
		 *
		 * @see `AddressDriverClient` and `DripsHubClient`'s API for more details.
		 * @param  {CollectFlowPayload} payload the flow's payload.
		 * @returns The preset.
		 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
		 * @throws {DripsErrors.addressError} if `payload.tokenAddress` or `payload.transferToAddress` is not valid.
		 * @throws {DripsErrors.argumentError} if `payload.currentReceivers`' count exceeds the max allowed splits receivers.
		 * @throws {DripsErrors.splitsReceiverError} if any of the `payload.currentReceivers` is not valid.
		 */
		public static collectFlow(payload: CollectFlowPayload): Preset {
			if (isNullOrUndefined(payload)) {
				throw DripsErrors.argumentMissingError(
					`Could not create collect flow: '${nameOf({ payload })}' is missing.`,
					nameOf({ payload })
				);
			}

			const { driverAddress, dripsHubAddress, userId, tokenAddress, maxCycles, currentReceivers, transferToAddress } =
				payload;

			validateAddress(tokenAddress);
			validateAddress(transferToAddress);
			validateSplitsReceivers(currentReceivers);
			if (isNullOrUndefined(userId)) {
				throw DripsErrors.argumentMissingError(
					`Could not get receivable cycles count: '${nameOf({ userId })}' is missing.`,
					nameOf({ userId })
				);
			}

			const receive: CallStruct = {
				value: 0,
				to: dripsHubAddress,
				data: DripsHub__factory.createInterface().encodeFunctionData('receiveDrips', [userId, tokenAddress, maxCycles])
			};

			if (isNullOrUndefined(userId)) {
				throw DripsErrors.argumentMissingError(
					`Could not split: '${nameOf({ userId })}' is missing.`,
					nameOf({ userId })
				);
			}

			const split: CallStruct = {
				value: 0,
				to: dripsHubAddress,
				data: DripsHub__factory.createInterface().encodeFunctionData('split', [userId, tokenAddress, currentReceivers])
			};

			const collect: CallStruct = {
				value: 0,
				to: driverAddress,
				data: DripsHub__factory.createInterface().encodeFunctionData('collect', [tokenAddress, transferToAddress])
			};

			return [receive, split, collect];
		}
	}
}
