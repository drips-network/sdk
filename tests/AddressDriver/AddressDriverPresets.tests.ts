import { assert } from 'chai';
import type { BytesLike, PopulatedTransaction } from 'ethers';
import { BigNumber, Wallet } from 'ethers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { AddressDriverPresets } from '../../src/AddressDriver/AddressDriverPresets';
import { DripsErrorCode } from '../../src/common/DripsError';
import { keyFromString, valueFromString } from '../../src/common/internals';
import * as validators from '../../src/common/validators';
import Utils from '../../src/utils';
import AddressDriverTxFactory from '../../src/AddressDriver/AddressDriverTxFactory';
import DripsHubTxFactory from '../../src/DripsHub/DripsHubTxFactory';

describe('AddressDriverPresets', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let dripsHubTxFactoryStub: StubbedInstance<DripsHubTxFactory>;
	let addressDriverFactoryStub: StubbedInstance<AddressDriverTxFactory>;

	beforeEach(async () => {
		dripsHubTxFactoryStub = stubInterface<DripsHubTxFactory>();
		addressDriverFactoryStub = stubInterface<AddressDriverTxFactory>();

		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		sinon.stub(AddressDriverTxFactory, 'create').resolves(addressDriverFactoryStub);
		sinon.stub(DripsHubTxFactory, 'create').resolves(dripsHubTxFactoryStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('createNewStreamFlow', () => {
		it('it should throw an argumentMissingError when payload is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await AddressDriverPresets.Presets.createNewStreamFlow(
					undefined as unknown as AddressDriverPresets.NewStreamFlowPayload
				);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it("it should throw an argumentError when signer's provider is missing", async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await AddressDriverPresets.Presets.createNewStreamFlow({} as AddressDriverPresets.NewStreamFlowPayload);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the setDrips input', async () => {
			// Arrange
			const validateSetDripsInputStub = sinon.stub(validators, 'validateSetDripsInput');

			const payload: AddressDriverPresets.NewStreamFlowPayload = {
				signer: signerWithProviderStub,
				userMetadata: [],
				balanceDelta: 1,
				currentReceivers: [
					{
						userId: 1n,
						config: Utils.DripsReceiverConfiguration.toUint256({
							amountPerSec: 1n,
							start: 1n,
							dripId: 1n,
							duration: 1n
						})
					}
				],
				newReceivers: [
					{
						userId: 2n,
						config: Utils.DripsReceiverConfiguration.toUint256({
							amountPerSec: 2n,
							start: 2n,
							dripId: 2n,
							duration: 2n
						})
					}
				],
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address
			};

			// Act
			await AddressDriverPresets.Presets.createNewStreamFlow(payload);

			// Assert
			assert(
				validateSetDripsInputStub.calledOnceWithExactly(
					payload.tokenAddress,
					sinon.match.array.deepEquals(
						payload.currentReceivers?.map((r) => ({
							userId: r.userId.toString(),
							config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
						}))
					),
					sinon.match.array.deepEquals(
						payload.newReceivers?.map((r) => ({
							userId: r.userId.toString(),
							config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
						}))
					),
					payload.transferToAddress,
					payload.balanceDelta
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the emitUserMetadata input', async () => {
			// Arrange
			const validateEmitUserMetadataInputStub = sinon.stub(validators, 'validateEmitUserMetadataInput');

			const payload: AddressDriverPresets.NewStreamFlowPayload = {
				signer: signerWithProviderStub,
				userMetadata: [],
				balanceDelta: 1,
				currentReceivers: [
					{
						userId: 1n,
						config: Utils.DripsReceiverConfiguration.toUint256({
							amountPerSec: 1n,
							start: 1n,
							dripId: 1n,
							duration: 1n
						})
					}
				],
				newReceivers: [
					{
						userId: 2n,
						config: Utils.DripsReceiverConfiguration.toUint256({
							amountPerSec: 2n,
							start: 2n,
							dripId: 2n,
							duration: 2n
						})
					}
				],
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address
			};

			// Act
			await AddressDriverPresets.Presets.createNewStreamFlow(payload);

			// Assert
			assert(
				validateEmitUserMetadataInputStub.calledOnceWithExactly(payload.userMetadata),
				'Expected method to be called with different arguments'
			);
		});

		it('should return the expected preset', async () => {
			// Arrange
			sinon.stub(validators, 'validateSetDripsInput');
			sinon.stub(validators, 'validateEmitUserMetadataInput');

			const payload: AddressDriverPresets.NewStreamFlowPayload = {
				signer: signerWithProviderStub,
				userMetadata: [{ key: 'key', value: 'value' }],
				balanceDelta: 1,
				currentReceivers: [
					{
						userId: 1n,
						config: Utils.DripsReceiverConfiguration.toUint256({
							amountPerSec: 1n,
							start: 1n,
							dripId: 1n,
							duration: 1n
						})
					}
				],
				newReceivers: [
					{
						userId: 2n,
						config: Utils.DripsReceiverConfiguration.toUint256({
							amountPerSec: 2n,
							start: 2n,
							dripId: 2n,
							duration: 2n
						})
					}
				],
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address
			};

			addressDriverFactoryStub.setDrips
				.withArgs(
					payload.tokenAddress,
					payload.currentReceivers,
					payload.balanceDelta,
					payload.newReceivers,
					0,
					0,
					payload.transferToAddress
				)
				.resolves({ data: 'setDrips' } as PopulatedTransaction);

			addressDriverFactoryStub.emitUserMetadata
				.withArgs(
					sinon.match(
						(
							userMetadataAsBytes: {
								key: BytesLike;
								value: BytesLike;
							}[]
						) =>
							userMetadataAsBytes[0].key === keyFromString(payload.userMetadata[0].key) &&
							userMetadataAsBytes[0].value === valueFromString(payload.userMetadata[0].value)
					)
				)
				.resolves({ data: 'emitUserMetadata' } as PopulatedTransaction);

			// Act
			const preset = await AddressDriverPresets.Presets.createNewStreamFlow(payload);

			// Assert
			assert.equal(preset.length, 2);
			assert.equal(preset[0].data, 'setDrips');
			assert.equal(preset[1].data, 'emitUserMetadata');
		});
	});

	describe('createCollectFlow', () => {
		it('it should throw an argumentMissingError when payload is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await AddressDriverPresets.Presets.createCollectFlow(
					undefined as unknown as AddressDriverPresets.CollectFlowPayload
				);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it("it should throw an argumentError when signer's provider is missing", async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await AddressDriverPresets.Presets.createCollectFlow({} as AddressDriverPresets.CollectFlowPayload);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the squeezeDrips input', async () => {
			// Arrange
			const validateSqueezeDripsInputStub = sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				userId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsHubAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						userId: 1n,
						weight: 1n
					}
				],
				squeezeArgs: [
					{
						userId: '1',
						senderId: '1',
						tokenAddress: Wallet.createRandom().address,
						historyHash: '0x00',
						dripsHistory: []
					}
				]
			};

			// Act
			await AddressDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert(
				validateSqueezeDripsInputStub.calledOnceWithExactly(
					payload.squeezeArgs![0].userId,
					payload.squeezeArgs![0].tokenAddress,
					payload.squeezeArgs![0].senderId,
					payload.squeezeArgs![0].historyHash,
					payload.squeezeArgs![0].dripsHistory
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the receiveDrips input', async () => {
			// Arrange
			const validateReceiveDripsInputStub = sinon.stub(validators, 'validateReceiveDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				userId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsHubAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						userId: 1n,
						weight: 1n
					}
				]
			};

			// Act
			await AddressDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert(
				validateReceiveDripsInputStub.calledOnceWithExactly(payload.userId, payload.tokenAddress, payload.maxCycles),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the split input', async () => {
			// Arrange
			const validateSplitInputStub = sinon.stub(validators, 'validateSplitInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				userId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsHubAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						userId: 1n,
						weight: 1n
					}
				]
			};

			// Act
			await AddressDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert(
				validateSplitInputStub.calledOnceWithExactly(payload.userId, payload.tokenAddress, payload.currentReceivers),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the collect input', async () => {
			// Arrange
			const validateCollectInputStub = sinon.stub(validators, 'validateCollectInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				userId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsHubAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						userId: 1n,
						weight: 1n
					}
				]
			};

			// Act
			await AddressDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert(
				validateCollectInputStub.calledOnceWithExactly(payload.tokenAddress, payload.transferToAddress),
				'Expected method to be called with different arguments'
			);
		});

		it('should return the expected preset', async () => {
			// Arrange
			sinon.stub(validators, 'validateSplitInput');
			sinon.stub(validators, 'validateCollectInput');
			sinon.stub(validators, 'validateReceiveDripsInput');
			sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				userId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsHubAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						userId: 2n,
						weight: 2n
					},
					{
						userId: 1n,
						weight: 1n
					}
				],
				squeezeArgs: [
					{
						userId: '1',
						senderId: '1',
						tokenAddress: Wallet.createRandom().address,
						historyHash: '0x00',
						dripsHistory: []
					},
					{
						userId: '2',
						senderId: '2',
						tokenAddress: Wallet.createRandom().address,
						historyHash: '0x00',
						dripsHistory: []
					}
				]
			};

			dripsHubTxFactoryStub.squeezeDrips.resolves({ data: 'squeezeDrips' } as PopulatedTransaction);

			dripsHubTxFactoryStub.receiveDrips
				.withArgs(payload.userId, payload.tokenAddress, payload.maxCycles)
				.resolves({ data: 'receiveDrips' } as PopulatedTransaction);

			dripsHubTxFactoryStub.split
				.withArgs(payload.userId, payload.tokenAddress, payload.currentReceivers)
				.resolves({ data: 'split' } as PopulatedTransaction);

			addressDriverFactoryStub.collect
				.withArgs(payload.tokenAddress, payload.transferToAddress)
				.resolves({ data: 'collect' } as PopulatedTransaction);

			// Act
			const preset = await AddressDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert.equal(preset.length, 5);
			assert.equal(preset[0].data, 'squeezeDrips');
			assert.equal(preset[1].data, 'squeezeDrips');
			assert.equal(preset[2].data, 'receiveDrips');
			assert.equal(preset[3].data, 'split');
			assert.equal(preset[4].data, 'collect');
		});

		it('should return the expected preset when skip receiveDrips is true', async () => {
			// Arrange
			sinon.stub(validators, 'validateSplitInput');
			sinon.stub(validators, 'validateCollectInput');
			sinon.stub(validators, 'validateReceiveDripsInput');
			sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				userId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsHubAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						userId: 1n,
						weight: 1n
					}
				]
			};

			dripsHubTxFactoryStub.split
				.withArgs(payload.userId, payload.tokenAddress, payload.currentReceivers)
				.resolves({ data: 'split' } as PopulatedTransaction);

			addressDriverFactoryStub.collect
				.withArgs(payload.tokenAddress, payload.transferToAddress)
				.resolves({ data: 'collect' } as PopulatedTransaction);

			// Act
			const preset = await AddressDriverPresets.Presets.createCollectFlow(payload, true, false);

			// Assert
			assert.equal(preset.length, 2);
			assert.equal(preset[0].data, 'split');
			assert.equal(preset[1].data, 'collect');
		});

		it('should return the expected preset when skip split is true', async () => {
			// Arrange
			sinon.stub(validators, 'validateSplitInput');
			sinon.stub(validators, 'validateCollectInput');
			sinon.stub(validators, 'validateReceiveDripsInput');
			sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				userId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsHubAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						userId: 1n,
						weight: 1n
					}
				]
			};

			dripsHubTxFactoryStub.receiveDrips
				.withArgs(payload.userId, payload.tokenAddress, payload.maxCycles)
				.resolves({ data: 'receiveDrips' } as PopulatedTransaction);

			addressDriverFactoryStub.collect
				.withArgs(payload.tokenAddress, payload.transferToAddress)
				.resolves({ data: 'collect' } as PopulatedTransaction);

			// Act
			const preset = await AddressDriverPresets.Presets.createCollectFlow(payload, false, true);

			// Assert
			assert.equal(preset.length, 2);
			assert.equal(preset[0].data, 'receiveDrips');
			assert.equal(preset[1].data, 'collect');
		});

		it('should return the expected preset when skip receiveDrips and split are true', async () => {
			// Arrange
			sinon.stub(validators, 'validateSplitInput');
			sinon.stub(validators, 'validateCollectInput');
			sinon.stub(validators, 'validateReceiveDripsInput');
			sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				userId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsHubAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						userId: 1n,
						weight: 1n
					}
				]
			};

			addressDriverFactoryStub.collect
				.withArgs(payload.tokenAddress, payload.transferToAddress)
				.resolves({ data: 'collect' } as PopulatedTransaction);

			// Act
			const preset = await AddressDriverPresets.Presets.createCollectFlow(payload, true, true);

			// Assert
			assert.equal(preset.length, 1);
			assert.equal(preset[0].data, 'collect');
		});
	});
});
