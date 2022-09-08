import { assert } from 'chai';
import type { BigNumber } from 'ethers';
import { ethers } from 'ethers';
import sinon from 'ts-sinon';
import * as internals from '../src/common/internals';
import type { DripsReceiverConfig } from '../src/common/types';
import Utils from '../src/utils';

describe('Utils', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('Assets', () => {
		describe('getTokenAddressFromAssetId()', () => {
			it('should return the expected result', () => {
				// Arrange
				const assetId = '1033236945445138540915192691692934361059155904726';

				// Act
				const token = Utils.Asset.getAddressFromId(assetId);

				// Assert
				assert.equal(token, ethers.utils.getAddress(internals.toBN(assetId).toHexString()));
			});
		});

		describe('getAssetIdFromAddress()', () => {
			it('should validate ERC20 address', () => {
				// Arrange
				const erc20Address = '-1';
				const validateAddressStub = sinon.stub(internals, 'validateAddress');

				// Act
				Utils.Asset.getIdFromAddress(erc20Address);

				// Assert
				assert(
					validateAddressStub.calledOnceWithExactly(erc20Address),
					'Expected method to be called with different arguments'
				);
			});

			it('should return the expected result', () => {
				// Arrange
				const erc20Address = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

				// Act
				const assetId = Utils.Asset.getIdFromAddress(erc20Address);

				// Assert
				assert.equal(assetId, internals.toBN(erc20Address).toString());
			});
		});
	});

	describe('Constants', () => {
		it('should return the expected constants', () => {
			// Assert
			assert.equal(Utils.Constants.MAX_DRIPS_RECEIVERS, 100);
			assert.equal(Utils.Constants.MAX_SPLITS_RECEIVERS, 200);
			assert.equal(Utils.Constants.TOTAL_SPLITS_WEIGHT, 1_000_000);
		});
	});

	describe('DripsReceiverConfiguration', () => {
		describe('toUint256()', () => {
			it('should validate drips receiver config', () => {
				// Arrange
				const config: DripsReceiverConfig = { start: 1, duration: 1, amountPerSec: 1 };

				const validateDripsReceiverConfigObjStub = sinon.stub(internals, 'validateDripsReceiverConfigObj');

				// Act
				Utils.DripsReceiverConfiguration.toUint256(config);

				// Assert
				assert(
					validateDripsReceiverConfigObjStub.calledOnceWithExactly(config),
					'Expected method to be called with different arguments'
				);
			});

			it('should return the expected result', async () => {
				// Arrange
				const expectedConfig = '0x010000000200000003';

				// Act
				const config: BigNumber = Utils.DripsReceiverConfiguration.toUint256({
					start: 2,
					duration: 3,
					amountPerSec: 1
				});

				// Assert
				assert(
					config.eq(expectedConfig),
					`Expected config to be equal to '${expectedConfig}' but was '${config.toHexString()}'`
				);
			});
		});

		describe('fromUint256()', () => {
			it('should validate drips receiver config', () => {
				// Arrange
				const config = '0x010000000200000003';

				const validateDripsReceiverConfigBNStub = sinon.stub(internals, 'validateDripsReceiverConfigBN');

				// Act
				Utils.DripsReceiverConfiguration.fromUint256(config);

				// Assert
				assert(
					validateDripsReceiverConfigBNStub.calledOnceWithExactly(config),
					'Expected method to be called with different arguments'
				);
			});

			it('should return the expected result', async () => {
				// Arrange
				const expectedConfig: DripsReceiverConfig = {
					start: internals.toBN(2),
					duration: internals.toBN(3),
					amountPerSec: internals.toBN(1)
				};
				const { start, duration, amountPerSec } = expectedConfig;

				// Act
				const config: DripsReceiverConfig = Utils.DripsReceiverConfiguration.fromUint256('0x010000000200000003');

				// Assert
				assert(
					internals.toBN(config.amountPerSec).eq(expectedConfig.amountPerSec),
					`Expected config '${internals.nameOf({ amountPerSec })}' to be equal to '${
						expectedConfig.amountPerSec
					}' but was '${internals.toBN(config.amountPerSec).toHexString()}'`
				);
				assert(
					internals.toBN(config.start).eq(expectedConfig.start),
					`Expected config '${internals.nameOf({ start })}' to be equal to '${
						expectedConfig.start
					}' but was '${internals.toBN(config.start).toHexString()}'`
				);
				assert(
					internals.toBN(config.duration).eq(expectedConfig.duration),
					`Expected config '${internals.nameOf({ duration })} 'to be equal to '${
						expectedConfig.duration
					}' but was '${internals.toBN(config.duration).toHexString()}'`
				);
			});
		});
	});

	describe('Network', () => {
		describe('chainMetadata', () => {
			it('should export only unique and supported chain IDs', () => {
				// Arrange
				const chainIds = [5];

				// Assert
				assert.includeMembers(Utils.Network.SUPPORTED_CHAINS as number[], chainIds);
				assert.equal([...new Set(Utils.Network.SUPPORTED_CHAINS)].length, [...new Set(chainIds)].length);
			});
		});
	});

	// describe('mapDripsReceiverDtosToStructs()', () => {
	// 	it('should return the expected result', () => {
	// 		// Arrange
	// 		const Drip: DripsReceiver = {
	// 			config: new DripsReceiverConfig(1, 1, 1),
	// 			receiverUserId: '2'
	// 		};

	// 		// Act
	// 		const dripStructs: DripsReceiverStruct[] = utils.mappers.mapDripsReceiverDtosToStructs([Drip]);

	// 		// Assert
	// 		assert.equal(dripStructs.length, 1);
	// 		assert.isTrue(toBN(dripStructs[0].config).eq(Drip.config.asUint256));
	// 		assert.isTrue(toBN(dripStructs[0].userId).eq(Drip.receiverUserId));
	// 	});
	// });

	// describe('mapSplitsDtosToStructs()', () => {
	// 	it('should return the expected result', () => {
	// 		// Arrange
	// 		const splitsEntry: Split = {
	// 			weight: '1234',
	// 			receiverUserId: '2'
	// 		};

	// 		// Act
	// 		const dripStructs: SplitsReceiverStruct[] = utils.mappers.mapSplitsDtosToStructs([splitsEntry]);

	// 		// Assert
	// 		assert.equal(dripStructs.length, 1);
	// 		assert.equal(dripStructs[0].weight, splitsEntry.weight);
	// 		assert.equal(dripStructs[0].userId, splitsEntry.receiverUserId);
	// 	});
	// });
});
