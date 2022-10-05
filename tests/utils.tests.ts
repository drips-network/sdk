import { assert } from 'chai';
import { ethers } from 'ethers';
import sinon from 'ts-sinon';
import { DripsErrorCode } from '../src/common/DripsError';
import * as internals from '../src/common/internals';
import type { DripsReceiverConfig } from '../src/common/types';
import Utils from '../src/utils';

describe('Utils', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('Cycle', () => {
		describe('getInfo()', () => {
			it('should throw unsupportedNetworkError when the provided chain ID is not supported', async () => {
				// Arrange
				let threw = false;

				// Act
				try {
					await Utils.Cycle.getInfo(100);
				} catch (error: any) {
					// Assert
					assert.equal(error.code, DripsErrorCode.UNSUPPORTED_NETWORK);
					threw = true;
				}

				// Assert
				assert.isTrue(threw, 'Expected type of exception was not thrown');
			});

			it('should return the expected result', async () => {
				// Arrange
				const now = new Date(0).getTime() / 1000 + 2 * 604800 + 86400;
				const clock = sinon.useFakeTimers(now * 1000);
				// assertions

				// Act
				const result = await Utils.Cycle.getInfo(5);

				// Assert
				assert.equal(result.cycleDurationSecs, 604800n);
				assert.equal(result.currentCycleSecs, 86400n);
				assert.equal(result.currentCycleStartDate.toISOString(), '1970-01-15T00:00:00.000Z');
				assert.equal(result.nextCycleStartDate.toISOString(), '1970-01-22T00:00:00.000Z');

				clock.restore();
			});
		});
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
			assert(Utils.Constants.AMT_PER_SEC_MULTIPLIER.eq(internals.toBN(10).pow(18)));
		});
	});

	describe('DripsReceiverConfiguration', () => {
		describe('toUint256String()', () => {
			it('should validate drips receiver config', () => {
				// Arrange
				const config: DripsReceiverConfig = { start: 1, duration: 1, amountPerSec: 1 };

				const validateDripsReceiverConfigObjStub = sinon.stub(internals, 'validateDripsReceiverConfigObj');

				// Act
				Utils.DripsReceiverConfiguration.toUint256String(config);

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
				const config: string = Utils.DripsReceiverConfiguration.toUint256String({
					start: 2,
					duration: 3,
					amountPerSec: 1
				});

				// Assert
				assert.equal(config, internals.toBN(expectedConfig).toString());
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
		describe('chainDripsMetadata', () => {
			it('should export only unique and supported chain IDs', () => {
				// Arrange
				const chainIds = [5];

				// Assert
				assert.includeMembers(Utils.Network.SUPPORTED_CHAINS as number[], chainIds);
				assert.equal([...new Set(Utils.Network.SUPPORTED_CHAINS)].length, [...new Set(chainIds)].length);
			});
		});

		describe('isSupportedChain', () => {
			it('should return true is chain ID is supported', () => {
				// Arrange

				// Act
				const isSupported = Utils.Network.isSupportedChain(5);

				// Assert
				assert.isTrue(isSupported);
			});

			it('should return false is chain ID is not supported', () => {
				// Arrange

				// Act
				const isSupported = Utils.Network.isSupportedChain(7);

				// Assert
				assert.isFalse(isSupported);
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
