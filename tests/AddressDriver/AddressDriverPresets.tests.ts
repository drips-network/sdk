import { assert } from 'chai';
import { BigNumber, Wallet } from 'ethers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface } from 'ts-sinon';
import { AddressDriver__factory, DripsHub__factory } from '../../contracts';
import type { AddressDriverInterface } from '../../contracts/AddressDriver';
import type { DripsHubInterface } from '../../contracts/DripsHub';
import { AddressDriverPresets } from '../../src/AddressDriver/AddressDriverPresets';
import { DripsErrorCode } from '../../src/common/DripsError';
import { formatDripsReceivers, keyFromString, valueFromString } from '../../src/common/internals';
import type { UserMetadataStruct } from '../../src/common/types';
import * as validators from '../../src/common/validators';
import Utils from '../../src/utils';

describe('AddressDriverPresets', () => {
	let dripsHubInterfaceStub: StubbedInstance<DripsHubInterface>;
	let addressDriverInterfaceStub: StubbedInstance<AddressDriverInterface>;

	beforeEach(async () => {
		dripsHubInterfaceStub = stubInterface<DripsHubInterface>();
		addressDriverInterfaceStub = stubInterface<AddressDriverInterface>();

		sinon.stub(AddressDriver__factory, 'createInterface').returns(addressDriverInterfaceStub);
		sinon.stub(DripsHub__factory, 'createInterface').returns(dripsHubInterfaceStub);
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
				AddressDriverPresets.Presets.createNewStreamFlow(
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

		it('should validate the setDrips input', async () => {
			// Arrange
			const validateSetDripsInputStub = sinon.stub(validators, 'validateSetDripsInput');

			const payload: AddressDriverPresets.NewStreamFlowPayload = {
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
			AddressDriverPresets.Presets.createNewStreamFlow(payload);

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
			AddressDriverPresets.Presets.createNewStreamFlow(payload);

			// Assert
			assert(
				validateEmitUserMetadataInputStub.calledOnceWithExactly(payload.userMetadata),
				'Expected method to be called with different arguments'
			);
		});

		it('should return the expected preset', () => {
			// Arrange
			sinon.stub(validators, 'validateSetDripsInput');
			sinon.stub(validators, 'validateEmitUserMetadataInput');

			const payload: AddressDriverPresets.NewStreamFlowPayload = {
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

			addressDriverInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'setDrips'),
					sinon.match.array.deepEquals([
						payload.tokenAddress,
						formatDripsReceivers(payload.currentReceivers),
						payload.balanceDelta,
						formatDripsReceivers(payload.newReceivers),
						0,
						0,
						payload.transferToAddress
					])
				)
				.returns('setDrips');

			addressDriverInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'emitUserMetadata'),
					sinon.match(
						(values: UserMetadataStruct[][]) =>
							values[0][0].key === keyFromString(payload.userMetadata[0].key) &&
							values[0][0].value === valueFromString(payload.userMetadata[0].value)
					)
				)

				.returns('emitUserMetadata');

			// Act
			const preset = AddressDriverPresets.Presets.createNewStreamFlow(payload);

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
				AddressDriverPresets.Presets.createCollectFlow(undefined as unknown as AddressDriverPresets.CollectFlowPayload);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the squeezeDrips input', async () => {
			// Arrange
			const validateSqueezeDripsInputStub = sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
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
			AddressDriverPresets.Presets.createCollectFlow(payload);

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
			AddressDriverPresets.Presets.createCollectFlow(payload);

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
			AddressDriverPresets.Presets.createCollectFlow(payload);

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
			AddressDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert(
				validateCollectInputStub.calledOnceWithExactly(payload.tokenAddress, payload.transferToAddress),
				'Expected method to be called with different arguments'
			);
		});

		it('should return the expected preset', () => {
			// Arrange
			sinon.stub(validators, 'validateSplitInput');
			sinon.stub(validators, 'validateCollectInput');
			sinon.stub(validators, 'validateReceiveDripsInput');
			sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
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

			dripsHubInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'squeezeDrips'),
					sinon.match.array
				)
				.returns('squeezeDrips');

			dripsHubInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'receiveDrips'),
					sinon.match.array.deepEquals([payload.userId, payload.tokenAddress, payload.maxCycles])
				)
				.returns('receiveDrips');

			dripsHubInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'split'),
					sinon.match.array.deepEquals([payload.userId, payload.tokenAddress, payload.currentReceivers])
				)
				.returns('split');

			addressDriverInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'collect'),
					sinon.match.array.deepEquals([payload.tokenAddress, payload.transferToAddress])
				)
				.returns('collect');

			// Act
			const preset = AddressDriverPresets.Presets.createCollectFlow(payload);

			// Assert
			assert.equal(preset.length, 5);
			assert.equal(preset[0].data, 'squeezeDrips');
			assert.equal(preset[1].data, 'squeezeDrips');
			assert.equal(preset[2].data, 'receiveDrips');
			assert.equal(preset[3].data, 'split');
			assert.equal(preset[4].data, 'collect');
		});

		it('should return the expected preset when skip receiveDrips is true', () => {
			// Arrange
			sinon.stub(validators, 'validateSplitInput');
			sinon.stub(validators, 'validateCollectInput');
			sinon.stub(validators, 'validateReceiveDripsInput');
			sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
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

			dripsHubInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'split'),
					sinon.match.array.deepEquals([payload.userId, payload.tokenAddress, payload.currentReceivers])
				)
				.returns('split');

			addressDriverInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'collect'),
					sinon.match.array.deepEquals([payload.tokenAddress, payload.transferToAddress])
				)
				.returns('collect');

			// Act
			const preset = AddressDriverPresets.Presets.createCollectFlow(payload, true, false);

			// Assert
			assert.equal(preset.length, 2);
			assert.equal(preset[0].data, 'split');
			assert.equal(preset[1].data, 'collect');
		});

		it('should return the expected preset when skip split is true', () => {
			// Arrange
			sinon.stub(validators, 'validateSplitInput');
			sinon.stub(validators, 'validateCollectInput');
			sinon.stub(validators, 'validateReceiveDripsInput');
			sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
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

			dripsHubInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'receiveDrips'),
					sinon.match.array.deepEquals([payload.userId, payload.tokenAddress, payload.maxCycles])
				)
				.returns('receiveDrips');

			addressDriverInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'collect'),
					sinon.match.array.deepEquals([payload.tokenAddress, payload.transferToAddress])
				)
				.returns('collect');

			// Act
			const preset = AddressDriverPresets.Presets.createCollectFlow(payload, false, true);

			// Assert
			assert.equal(preset.length, 2);
			assert.equal(preset[0].data, 'receiveDrips');
			assert.equal(preset[1].data, 'collect');
		});

		it('should return the expected preset when skip receiveDrips and split are true', () => {
			// Arrange
			sinon.stub(validators, 'validateSplitInput');
			sinon.stub(validators, 'validateCollectInput');
			sinon.stub(validators, 'validateReceiveDripsInput');
			sinon.stub(validators, 'validateSqueezeDripsInput');

			const payload: AddressDriverPresets.CollectFlowPayload = {
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

			addressDriverInterfaceStub.encodeFunctionData
				.withArgs(
					sinon.match((s: string) => s === 'collect'),
					sinon.match.array.deepEquals([payload.tokenAddress, payload.transferToAddress])
				)
				.returns('collect');

			// Act
			const preset = AddressDriverPresets.Presets.createCollectFlow(payload, true, true);

			// Assert
			assert.equal(preset.length, 1);
			assert.equal(preset[0].data, 'collect');
		});
	});
});
