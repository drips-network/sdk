import { assert } from 'chai';
import { BigNumber, ethers, Wallet } from 'ethers';
import sinon from 'ts-sinon';
import { DripsErrorCode } from '../src/common/DripsError';
import * as internals from '../src/common/internals';
import * as validators from '../src/common/validators';
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
				const result = Utils.Cycle.getInfo(5);

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
		describe('getAddressFromId()', () => {
			it('should return the expected result', () => {
				// Arrange
				const assetId = 1033236945445138540915192691692934361059155904726n;

				// Act
				const token = Utils.Asset.getAddressFromId(assetId);

				// Assert
				assert.equal(token, ethers.utils.getAddress(BigNumber.from(assetId).toHexString()));
			});
		});

		describe('getIdFromAddress()', () => {
			it('should validate ERC20 address', () => {
				// Arrange
				const tokenAddress = Wallet.createRandom().address;
				const validateAddressStub = sinon.stub(validators, 'validateAddress');

				// Act
				Utils.Asset.getIdFromAddress(tokenAddress);

				// Assert
				assert(
					validateAddressStub.calledOnceWithExactly(tokenAddress),
					'Expected method to be called with different arguments'
				);
			});

			it('should return the expected result', () => {
				// Arrange
				const tokenAddress = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

				// Act
				const assetId = Utils.Asset.getIdFromAddress(tokenAddress);

				// Assert
				assert.equal(assetId, BigNumber.from(tokenAddress).toBigInt());
			});
		});
	});

	describe('DripsReceiverConfiguration', () => {
		describe('toUint256()', () => {
			it('should validate drips receiver config', () => {
				// Arrange
				const config: DripsReceiverConfig = { dripId: 1n, start: 1n, duration: 1n, amountPerSec: 1n };

				const validateDripsReceiverConfigObjStub = sinon.stub(validators, 'validateDripsReceiverConfig');

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
				const expectedConfig = 269599466671506397946670150870196306736371444226143594574070383902750000n;

				// Act
				const config: bigint = Utils.DripsReceiverConfiguration.toUint256({
					dripId: 10000n,
					start: 20000n,
					duration: 30000n,
					amountPerSec: 40000n
				});

				// Assert
				assert.equal(config, BigNumber.from(expectedConfig).toBigInt());
			});
		});

		describe('fromUint256()', () => {
			it('should validate drips receiver config', () => {
				// Arrange
				const config =
					BigNumber.from(269599466671506397946670150870196306736371444226143594574070383902750000n).toBigInt();

				const configObj = Utils.DripsReceiverConfiguration.fromUint256(config);

				const validateDripsReceiverConfigBNStub = sinon.stub(validators, 'validateDripsReceiverConfig');

				// Act
				Utils.DripsReceiverConfiguration.fromUint256(config);

				// Assert
				assert(
					validateDripsReceiverConfigBNStub.calledOnceWithExactly(
						sinon.match(
							(c: DripsReceiverConfig) =>
								c.dripId === configObj.dripId &&
								c.start === configObj.start &&
								c.duration === configObj.duration &&
								c.amountPerSec === configObj.amountPerSec
						)
					),
					'Expected method to be called with different arguments'
				);
			});

			it('should return the expected result', async () => {
				// Arrange
				const expectedConfig: DripsReceiverConfig = {
					dripId: 10000n,
					start: 20000n,
					duration: 30000n,
					amountPerSec: 40000n
				};
				const { start, duration, amountPerSec } = expectedConfig;

				// Act
				const config: DripsReceiverConfig = Utils.DripsReceiverConfiguration.fromUint256(
					BigNumber.from(269599466671506397946670150870196306736371444226143594574070383902750000n).toBigInt()
				);

				// Assert
				assert(
					BigNumber.from(config.amountPerSec).eq(expectedConfig.amountPerSec),
					`Expected config '${internals.nameOf({ amountPerSec })}' to be equal to '${
						expectedConfig.amountPerSec
					}' but was '${BigNumber.from(config.amountPerSec).toHexString()}'`
				);
				assert(
					BigNumber.from(config.start).eq(expectedConfig.start),
					`Expected config '${internals.nameOf({ start })}' to be equal to '${
						expectedConfig.start
					}' but was '${BigNumber.from(config.start).toHexString()}'`
				);
				assert(
					BigNumber.from(config.duration).eq(expectedConfig.duration),
					`Expected config '${internals.nameOf({ duration })} 'to be equal to '${
						expectedConfig.duration
					}' but was '${BigNumber.from(config.duration).toHexString()}'`
				);
			});
		});
	});

	describe('Network', () => {
		describe('networkConfig', () => {
			it('should export only unique and supported chain IDs', () => {
				// Arrange
				const chainIds = [5, 80001];

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
});
