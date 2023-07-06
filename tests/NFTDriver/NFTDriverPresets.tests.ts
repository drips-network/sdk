import { assert } from 'chai';
import type { BytesLike, PopulatedTransaction } from 'ethers';
import { BigNumber, Wallet } from 'ethers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { NFTDriverPresets } from '../../src/NFTDriver/NFTDriverPresets';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as validators from '../../src/common/validators';
import Utils from '../../src/utils';
import NFTDriverTxFactory from '../../src/NFTDriver/NFTDriverTxFactory';
import DripsTxFactory from '../../src/Drips/DripsTxFactory';

describe('NFTDriverPresets', () => {
	const TEST_CHAIN_ID = 11155111; // Sepolia.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let dripsHubTxFactoryStub: StubbedInstance<DripsTxFactory>;
	let nftDriverFactoryStub: StubbedInstance<NFTDriverTxFactory>;

	beforeEach(async () => {
		dripsHubTxFactoryStub = stubInterface<DripsTxFactory>();
		nftDriverFactoryStub = stubInterface<NFTDriverTxFactory>();

		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		sinon.stub(NFTDriverTxFactory, 'create').resolves(nftDriverFactoryStub);
		sinon.stub(DripsTxFactory, 'create').resolves(dripsHubTxFactoryStub);
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
				await NFTDriverPresets.Presets.createNewStreamFlow(
					undefined as unknown as NFTDriverPresets.NewStreamFlowPayload
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
				await NFTDriverPresets.Presets.createNewStreamFlow({ tokenId: '1' } as NFTDriverPresets.NewStreamFlowPayload);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('it should throw an argumentError when token Id is missing from payload', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await NFTDriverPresets.Presets.createNewStreamFlow({} as NFTDriverPresets.NewStreamFlowPayload);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the setStreams input', async () => {
			// Arrange
			const validateSetDripsInputStub = sinon.stub(validators, 'validateSetStreamsInput');

			const payload: NFTDriverPresets.NewStreamFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountMetadata: [],
				balanceDelta: 1,
				currentReceivers: [
					{
						accountId: 1n,
						config: Utils.StreamConfiguration.toUint256({
							amountPerSec: 1n,
							start: 1n,
							dripId: 1n,
							duration: 1n
						})
					}
				],
				newReceivers: [
					{
						accountId: 2n,
						config: Utils.StreamConfiguration.toUint256({
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
			await NFTDriverPresets.Presets.createNewStreamFlow(payload);

			// Assert
			assert(
				validateSetDripsInputStub.calledOnceWithExactly(
					payload.tokenAddress,
					sinon.match.array.deepEquals(
						payload.currentReceivers?.map((r) => ({
							accountId: r.accountId.toString(),
							config: Utils.StreamConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
						}))
					),
					sinon.match.array.deepEquals(
						payload.newReceivers?.map((r) => ({
							accountId: r.accountId.toString(),
							config: Utils.StreamConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
						}))
					),
					payload.transferToAddress,
					payload.balanceDelta
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the emitAccountMetadata input', async () => {
			// Arrange
			const validateEmitAccountMetadataInputStub = sinon.stub(validators, 'validateEmitAccountMetadataInput');

			const payload: NFTDriverPresets.NewStreamFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountMetadata: [],
				balanceDelta: 1,
				currentReceivers: [
					{
						accountId: 1n,
						config: Utils.StreamConfiguration.toUint256({
							amountPerSec: 1n,
							start: 1n,
							dripId: 1n,
							duration: 1n
						})
					}
				],
				newReceivers: [
					{
						accountId: 2n,
						config: Utils.StreamConfiguration.toUint256({
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
			await NFTDriverPresets.Presets.createNewStreamFlow(payload);

			// Assert
			assert(
				validateEmitAccountMetadataInputStub.calledOnceWithExactly(payload.accountMetadata),
				'Expected method to be called with different arguments'
			);
		});

		it('should return the expected preset', async () => {
			// Arrange
			sinon.stub(validators, 'validateSetStreamsInput');
			sinon.stub(validators, 'validateEmitAccountMetadataInput');

			const payload: NFTDriverPresets.NewStreamFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountMetadata: [{ key: 'key', value: 'value' }],
				balanceDelta: 1,
				currentReceivers: [
					{
						accountId: 1n,
						config: Utils.StreamConfiguration.toUint256({
							amountPerSec: 1n,
							start: 1n,
							dripId: 1n,
							duration: 1n
						})
					}
				],
				newReceivers: [
					{
						accountId: 2n,
						config: Utils.StreamConfiguration.toUint256({
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

			nftDriverFactoryStub.setStreams
				.withArgs(
					payload.tokenId,
					payload.tokenAddress,
					payload.currentReceivers,
					payload.balanceDelta,
					payload.newReceivers,
					0,
					0,
					payload.transferToAddress
				)
				.resolves({ data: 'setStreams' } as PopulatedTransaction);

			nftDriverFactoryStub.emitAccountMetadata
				.withArgs(
					payload.tokenId,
					sinon.match(
						(
							accountMetadataAsBytes: {
								key: BytesLike;
								value: BytesLike;
							}[]
						) =>
							accountMetadataAsBytes[0].key === Utils.Metadata.keyFromString(payload.accountMetadata[0].key) &&
							accountMetadataAsBytes[0].value === Utils.Metadata.valueFromString(payload.accountMetadata[0].value)
					)
				)
				.resolves({ data: 'emitAccountMetadata' } as PopulatedTransaction);

			// Act
			const preset = await NFTDriverPresets.Presets.createNewStreamFlow(payload);

			// Assert
			assert.equal(preset.length, 2);
			assert.equal(preset[0].data, 'setStreams');
			assert.equal(preset[1].data, 'emitAccountMetadata');
		});
	});

	describe('createCollectFlow', () => {
		it('it should throw an argumentMissingError when payload is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await NFTDriverPresets.Presets.createCollectFlow(undefined as unknown as NFTDriverPresets.CollectFlowPayload);
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
				await NFTDriverPresets.Presets.createCollectFlow({ tokenId: '1' } as NFTDriverPresets.CollectFlowPayload);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('it should throw an argumentError when token Id is missing from payload', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await NFTDriverPresets.Presets.createCollectFlow({} as NFTDriverPresets.CollectFlowPayload);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the squeezeStreams input', async () => {
			// Arrange
			const validateSqueezeDripsInputStub = sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: NFTDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						accountId: 1n,
						weight: 1n
					}
				],
				squeezeArgs: [
					{
						accountId: '1',
						senderId: '1',
						tokenAddress: Wallet.createRandom().address,
						historyHash: '0x00',
						streamsHistory: []
					}
				]
			};

			// Act
			await NFTDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert(
				validateSqueezeDripsInputStub.calledOnceWithExactly(
					payload.squeezeArgs![0].accountId,
					payload.squeezeArgs![0].tokenAddress,
					payload.squeezeArgs![0].senderId,
					payload.squeezeArgs![0].historyHash,
					payload.squeezeArgs![0].streamsHistory
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the receiveStreams input', async () => {
			// Arrange
			const validateReceiveDripsInputStub = sinon.stub(validators, 'validateReceiveDripsInput');

			const payload: NFTDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						accountId: 1n,
						weight: 1n
					}
				],
				squeezeArgs: [
					{
						accountId: '1',
						senderId: '1',
						tokenAddress: Wallet.createRandom().address,
						historyHash: '0x00',
						streamsHistory: []
					}
				]
			};

			// Act
			await NFTDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert(
				validateReceiveDripsInputStub.calledOnceWithExactly(payload.accountId, payload.tokenAddress, payload.maxCycles),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the split input', async () => {
			// Arrange
			const validateSplitInputStub = sinon.stub(validators, 'validateSplitInput');

			const payload: NFTDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						accountId: 1n,
						weight: 1n
					}
				],
				squeezeArgs: [
					{
						accountId: '1',
						senderId: '1',
						tokenAddress: Wallet.createRandom().address,
						historyHash: '0x00',
						streamsHistory: []
					}
				]
			};

			// Act
			await NFTDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert(
				validateSplitInputStub.calledOnceWithExactly(payload.accountId, payload.tokenAddress, payload.currentReceivers),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the collect input', async () => {
			// Arrange
			const validateCollectInputStub = sinon.stub(validators, 'validateCollectInput');

			const payload: NFTDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						accountId: 1n,
						weight: 1n
					}
				],
				squeezeArgs: [
					{
						accountId: '1',
						senderId: '1',
						tokenAddress: Wallet.createRandom().address,
						historyHash: '0x00',
						streamsHistory: []
					}
				]
			};

			// Act
			await NFTDriverPresets.Presets.createCollectFlow(payload);

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

			const payload: NFTDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						accountId: 2n,
						weight: 2n
					},
					{
						accountId: 1n,
						weight: 1n
					}
				],
				squeezeArgs: [
					{
						accountId: '1',
						senderId: '1',
						tokenAddress: Wallet.createRandom().address,
						historyHash: '0x00',
						streamsHistory: []
					},
					{
						accountId: '2',
						senderId: '2',
						tokenAddress: Wallet.createRandom().address,
						historyHash: '0x00',
						streamsHistory: []
					}
				]
			};

			dripsHubTxFactoryStub.squeezeStreams.resolves({ data: 'squeezeStreams' } as PopulatedTransaction);

			dripsHubTxFactoryStub.receiveStreams
				.withArgs(payload.accountId, payload.tokenAddress, payload.maxCycles)
				.resolves({ data: 'receiveStreams' } as PopulatedTransaction);

			dripsHubTxFactoryStub.split
				.withArgs(payload.accountId, payload.tokenAddress, payload.currentReceivers)
				.resolves({ data: 'split' } as PopulatedTransaction);

			nftDriverFactoryStub.collect
				.withArgs(payload.tokenId, payload.tokenAddress, payload.transferToAddress)
				.resolves({ data: 'collect' } as PopulatedTransaction);

			// Act
			const preset = await NFTDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert.equal(preset.length, 5);
			assert.equal(preset[0].data, 'squeezeStreams');
			assert.equal(preset[1].data, 'squeezeStreams');
			assert.equal(preset[2].data, 'receiveStreams');
			assert.equal(preset[3].data, 'split');
			assert.equal(preset[4].data, 'collect');
		});

		it('should return the expected preset when skip receiveStreams is true', async () => {
			// Arrange
			sinon.stub(validators, 'validateSplitInput');
			sinon.stub(validators, 'validateCollectInput');
			sinon.stub(validators, 'validateReceiveDripsInput');
			sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: NFTDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						accountId: 1n,
						weight: 1n
					}
				]
			};

			dripsHubTxFactoryStub.split
				.withArgs(payload.accountId, payload.tokenAddress, payload.currentReceivers)
				.resolves({ data: 'split' } as PopulatedTransaction);
			nftDriverFactoryStub.collect
				.withArgs(payload.tokenId, payload.tokenAddress, payload.transferToAddress)
				.resolves({ data: 'collect' } as PopulatedTransaction);

			// Act
			const preset = await NFTDriverPresets.Presets.createCollectFlow(payload, true, false);

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

			const payload: NFTDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						accountId: 1n,
						weight: 1n
					}
				]
			};

			dripsHubTxFactoryStub.receiveStreams
				.withArgs(payload.accountId, payload.tokenAddress, payload.maxCycles)
				.resolves({ data: 'receiveStreams' } as PopulatedTransaction);

			nftDriverFactoryStub.collect
				.withArgs(payload.tokenId, payload.tokenAddress, payload.transferToAddress)
				.resolves({ data: 'collect' } as PopulatedTransaction);

			// Act
			const preset = await NFTDriverPresets.Presets.createCollectFlow(payload, false, true);

			// Assert
			assert.equal(preset.length, 2);
			assert.equal(preset[0].data, 'receiveStreams');
			assert.equal(preset[1].data, 'collect');
		});

		it('should return the expected preset when skip receiveStreams and split are true', async () => {
			// Arrange
			sinon.stub(validators, 'validateSplitInput');
			sinon.stub(validators, 'validateCollectInput');
			sinon.stub(validators, 'validateReceiveDripsInput');

			const payload: NFTDriverPresets.CollectFlowPayload = {
				signer: signerWithProviderStub,
				tokenId: '200',
				accountId: '1',
				maxCycles: 1,
				tokenAddress: Wallet.createRandom().address,
				driverAddress: Wallet.createRandom().address,
				dripsAddress: Wallet.createRandom().address,
				transferToAddress: Wallet.createRandom().address,
				currentReceivers: [
					{
						accountId: 1n,
						weight: 1n
					}
				]
			};

			nftDriverFactoryStub.collect
				.withArgs(payload.tokenId, payload.tokenAddress, payload.transferToAddress)
				.resolves({ data: 'collect' } as PopulatedTransaction);

			// Act
			const preset = await NFTDriverPresets.Presets.createCollectFlow(payload, true, true);

			// Assert
			assert.equal(preset.length, 1);
			assert.equal(preset[0].data, 'collect');
		});
	});
});
