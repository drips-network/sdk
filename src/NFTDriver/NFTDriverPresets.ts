import type { BigNumberish, PopulatedTransaction, Signer } from 'ethers';
import { BigNumber } from 'ethers';
import DripsTxFactory from '../Drips/DripsTxFactory';
import {
	validateCollectInput,
	validateEmitUserMetadataInput,
	validateReceiveDripsInput,
	validateSetStreamsInput,
	validateSplitInput,
	validateSqueezeDripsInput
} from '../common/validators';
import { isNullOrUndefined, nameOf } from '../common/internals';
import Utils from '../utils';
import type { StreamReceiverStruct, Preset, SplitsReceiverStruct, SqueezeArgs, UserMetadata } from '../common/types';
import { DripsErrors } from '../common/DripsError';
import NFTDriverTxFactory from './NFTDriverTxFactory';

export namespace NFTDriverPresets {
	export type NewStreamFlowPayload = {
		tokenId: string;
		signer: Signer;
		driverAddress: string;
		tokenAddress: string;
		currentReceivers: StreamReceiverStruct[];
		newReceivers: StreamReceiverStruct[];
		balanceDelta: BigNumberish;
		transferToAddress: string;
		userMetadata: UserMetadata[];
	};

	export type CollectFlowPayload = {
		tokenId: string;
		signer: Signer;
		driverAddress: string;
		dripsHubAddress: string;
		userId: string;
		tokenAddress: string;
		maxCycles: BigNumberish;
		currentReceivers: SplitsReceiverStruct[];
		transferToAddress: string;
		squeezeArgs?: SqueezeArgs[];
	};

	/**
 * Pre-configured sets of contract calls that can be used as input to `Caller.callBatched` method.
 * @see `CallerClient` for more.
 *
 *
 * @example <caption>Example usage of `collectFlow`.</caption>
 * // Create a new `Caller`.
 * const caller = await CallerClient.create(provider);
 *
 * // Populate the flow's payload.
	const flowPayload: NFTDriverPresets.CollectFlowPayload = {
		driverAddress,
		dripsHubAddress,
		userId,
		tokenAddress,
		maxCycles,
		currentReceivers,
		transferToAddress
	};

	// Create a new `collectFlow` preset.
	const collectFlow = NFTDriverPresets.Presets.collectFlow(flowPayload);

	// Pass the preset to the `Caller`.
	const tx = await caller.callBatched(collectFlow);
	await tx.wait();
	*/
	export class Presets {
		/**
		 * Creates a new batch with the following sequence of calls:
		 * 1. `setStreams`
		 * 2. `emitUserMetadata`
		 *
		 * @see `NFTDriverClient`'s API for more details.
		 * @param  {CreateStreamFlowPayload} payload the flow's payload.
		 * @returns The preset.
		 * @throws {@link DripsErrors.addressError} if `payload.tokenAddress` or `payload.transferToAddress` is not valid.
		 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
		 * @throws {@link DripsErrors.argumentError} if `payload.currentReceivers`' or `payload.newReceivers`' count exceeds the max allowed drips receivers.
		 * @throws {@link DripsErrors.streamsReceiverError} if any of the `payload.currentReceivers` or the `payload.newReceivers` is not valid.
		 * @throws {@link DripsErrors.streamConfigError} if any of the receivers' configuration is not valid.
		 */
		public static async createNewStreamFlow(payload: NewStreamFlowPayload): Promise<Preset> {
			if (isNullOrUndefined(payload)) {
				throw DripsErrors.argumentMissingError(
					`Could not create stream flow: '${nameOf({ payload })}' is missing.`,
					nameOf({ payload })
				);
			}

			const {
				signer,
				tokenId,
				userMetadata,
				tokenAddress,
				driverAddress,
				newReceivers,
				balanceDelta,
				currentReceivers,
				transferToAddress
			} = payload;

			if (isNullOrUndefined(tokenId)) {
				throw DripsErrors.argumentError(
					`Could not create stream flow: '${nameOf({ tokenId })}' is missing.`,
					nameOf({ tokenId }),
					tokenId
				);
			}

			if (!signer?.provider) {
				throw DripsErrors.argumentError(`Could not create collect flow: signer is not connected to a provider.`);
			}

			validateSetStreamsInput(
				tokenAddress,
				currentReceivers?.map((r) => ({
					userId: r.userId.toString(),
					config: Utils.StreamConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
				})),
				newReceivers?.map((r) => ({
					userId: r.userId.toString(),
					config: Utils.StreamConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
				})),
				transferToAddress,
				balanceDelta
			);
			validateEmitUserMetadataInput(userMetadata);

			const nftDriverTxFactory = await NFTDriverTxFactory.create(signer, driverAddress);

			const setStreamsTx = await nftDriverTxFactory.setStreams(
				tokenId,
				tokenAddress,
				currentReceivers,
				balanceDelta,
				newReceivers,
				0,
				0,
				transferToAddress
			);

			const userMetadataAsBytes = userMetadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const emitUserMetadataTx = await nftDriverTxFactory.emitUserMetadata(tokenId, userMetadataAsBytes);

			return [setStreamsTx, emitUserMetadataTx];
		}

		/**
		 * Creates a new batch with the following sequence of calls:
		 * 1. `squeezeStreams` (optional) for each provided sender
		 * 2. `receiveStreams` (optional)
		 * 3. `split` (optional)
		 * 4. `collect`
		 *
		 * @see `NFTDriverClient` and `DripsClient`'s API for more details.
		 * @param  {CollectFlowPayload} payload the flow's payload.
		 * @param  {boolean} skipReceive skips the `receiveStreams` step.
		 * @param  {boolean} skipSplit  skips the `split` step.
		 * @returns The preset.
		 * @throws {@link DripsErrors.addressError} if `payload.tokenAddress` or the `payload.transferToAddress` address is not valid.
		 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
		 * @throws {@link DripsErrors.argumentError} if `payload.maxCycles` or `payload.currentReceivers` is not valid.
		 * @throws {@link DripsErrors.splitsReceiverError} if any of the `payload.currentReceivers` is not valid.
		 */
		public static async createCollectFlow(
			payload: CollectFlowPayload,
			skipReceive: boolean = false,
			skipSplit: boolean = false
		): Promise<Preset> {
			if (isNullOrUndefined(payload)) {
				throw DripsErrors.argumentMissingError(
					`Could not create collect flow: '${nameOf({ payload })}' is missing.`,
					nameOf({ payload })
				);
			}

			const {
				tokenId,
				signer,
				driverAddress,
				dripsHubAddress,
				userId,
				tokenAddress,
				maxCycles,
				currentReceivers,
				transferToAddress,
				squeezeArgs
			} = payload;

			if (isNullOrUndefined(tokenId)) {
				throw DripsErrors.argumentError(
					`Could not create stream flow: '${nameOf({ tokenId })}' is missing.`,
					nameOf({ tokenId }),
					tokenId
				);
			}

			if (!signer?.provider) {
				throw DripsErrors.argumentError(`Could not create collect flow: signer is not connected to a provider.`);
			}

			const flow: PopulatedTransaction[] = [];

			const dripsTxFactory = await DripsTxFactory.create(signer.provider, dripsHubAddress);

			squeezeArgs?.forEach(async (args) => {
				validateSqueezeDripsInput(args.userId, args.tokenAddress, args.senderId, args.historyHash, args.dripsHistory);

				const squeezeTx = await dripsTxFactory.squeezeStreams(
					userId,
					tokenAddress,
					args.senderId,
					args.historyHash,
					args.dripsHistory
				);

				flow.push(squeezeTx);
			});

			if (!skipReceive) {
				validateReceiveDripsInput(userId, tokenAddress, maxCycles);

				const receiveTx = await dripsTxFactory.receiveStreams(userId, tokenAddress, maxCycles);

				flow.push(receiveTx);
			}

			if (!skipSplit) {
				validateSplitInput(userId, tokenAddress, currentReceivers);

				const splitTx = await dripsTxFactory.split(userId, tokenAddress, currentReceivers);

				flow.push(splitTx);
			}

			validateCollectInput(tokenAddress, transferToAddress);

			const nftDriverTxFactory = await NFTDriverTxFactory.create(signer, driverAddress);

			const collectTx = await nftDriverTxFactory.collect(tokenId, tokenAddress, transferToAddress);

			flow.push(collectTx);

			return flow;
		}
	}
}
