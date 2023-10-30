import { assert } from 'chai';
import type { BytesLike } from 'ethers';
import { BigNumber, ethers, Wallet } from 'ethers';
import sinon from 'ts-sinon';
import { DripsErrorCode } from '../src/common/DripsError';
import * as internals from '../src/common/internals';
import * as validators from '../src/common/validators';
import type { StreamConfig } from '../src/common/types';
import Utils from '../src/utils';

describe('Utils', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('Metadata', () => {
		describe('keyFromString', () => {
			it('should return the expected result', () => {
				// Act
				const key = Utils.Metadata.keyFromString('key');

				// Assert
				assert.equal(key, ethers.utils.formatBytes32String('key'));
			});
		});

		describe('valueFromString', () => {
			it('should return the expected result', () => {
				// Act
				const value = Utils.Metadata.valueFromString('value');

				// Assert
				assert.equal(value, ethers.utils.hexlify(ethers.utils.toUtf8Bytes('value')));
			});
		});

		describe('createFromStrings', () => {
			it('should return the expected result', () => {
				// Act
				const metadata = Utils.Metadata.createFromStrings('key', 'value');

				// Assert
				assert.equal(metadata.key, Utils.Metadata.keyFromString('key'));
				assert.equal(metadata.value, Utils.Metadata.valueFromString('value'));
			});
		});

		describe('convertMetadataBytesToString', () => {
			it('should throw argumentError user metadata key is not a valid BytesLike object', async () => {
				// Arrange
				let threw = false;

				// Act
				try {
					Utils.Metadata.convertMetadataBytesToString({ key: undefined as unknown as string, value: 'value' });
				} catch (error: any) {
					// Assert
					assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
					threw = true;
				}

				// Assert
				assert.isTrue(threw, 'Expected type of exception was not thrown');
			});

			it('should throw argumentError user metadata value is not a valid BytesLike object', async () => {
				// Arrange
				let threw = false;

				// Act
				try {
					Utils.Metadata.convertMetadataBytesToString({ key: 'key', value: undefined as unknown as string });
				} catch (error: any) {
					// Assert
					assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
					threw = true;
				}

				// Assert
				assert.isTrue(threw, 'Expected type of exception was not thrown');
			});

			it('should return the expected result', () => {
				// Act
				const key: BytesLike = Utils.Metadata.keyFromString('key');
				const value: BytesLike = Utils.Metadata.valueFromString('value');

				const metadata = Utils.Metadata.convertMetadataBytesToString({ key, value });

				// Assert
				assert.equal(metadata.key, 'key');
				assert.equal(metadata.value, 'value');
			});
		});
	});

	describe('Cycle', () => {
		describe('getInfo()', () => {
			it('should throw unsupportedNetworkError when the provided chain ID is not supported', async () => {
				// Arrange
				let threw = false;

				// Act
				try {
					Utils.Cycle.getInfo(100);
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
				const result = Utils.Cycle.getInfo(11155111);

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

	describe('StreamConfiguration', () => {
		describe('toUint256()', () => {
			it('should validate drips receiver config', () => {
				// Arrange
				const config: StreamConfig = { dripId: 1n, start: 1n, duration: 1n, amountPerSec: 1n };

				const validateStreamConfigObjStub = sinon.stub(validators, 'validateStreamConfig');

				// Act
				Utils.StreamConfiguration.toUint256(config);

				// Assert
				assert(
					validateStreamConfigObjStub.calledOnceWithExactly(config),
					'Expected method to be called with different arguments'
				);
			});

			it('should return the expected result', async () => {
				// Arrange
				const expectedConfig = 269599466671506397946670150870196306736371444226143594574070383902750000n;

				// Act
				const config: bigint = Utils.StreamConfiguration.toUint256({
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

				const configObj = Utils.StreamConfiguration.fromUint256(config);

				const validateStreamConfigBNStub = sinon.stub(validators, 'validateStreamConfig');

				// Act
				Utils.StreamConfiguration.fromUint256(config);

				// Assert
				assert(
					validateStreamConfigBNStub.calledOnceWithExactly(
						sinon.match(
							(c: StreamConfig) =>
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
				const expectedConfig: StreamConfig = {
					dripId: 10000n,
					start: 20000n,
					duration: 30000n,
					amountPerSec: 40000n
				};
				const { start, duration, amountPerSec } = expectedConfig;

				// Act
				const config: StreamConfig = Utils.StreamConfiguration.fromUint256(
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
				const chainIds = [1, 11155111, 5];

				// Assert
				assert.includeMembers(Utils.Network.SUPPORTED_CHAINS as number[], chainIds);
				assert.equal([...new Set(Utils.Network.SUPPORTED_CHAINS)].length, [...new Set(chainIds)].length);
			});
		});

		describe('isSupportedChain', () => {
			it('should return true is chain ID is supported', () => {
				// Arrange

				// Act
				const isSupported = Utils.Network.isSupportedChain(11155111);

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

	describe('AccountId', () => {
		describe('getDriver', () => {
			it('should return the expected result', () => {
				// TODO: Add test case for immutable address driver user ID.

				// Arrange
				const addressDriverAccountId = '846959513016227493489143736695218182523669298507';
				const nftDriverAccountId = '42583592044554662154154760653976070706375843797872425666273362826761';
				const repoDriverAccountId = '80907581203104634939800721083555800473270339779792920621438161136896';

				// Act
				const expectedNftDriverId = Utils.AccountId.getDriver(nftDriverAccountId);
				const expectedRepoDriverId = Utils.AccountId.getDriver(repoDriverAccountId);
				const expectedAddressDriverId = Utils.AccountId.getDriver(addressDriverAccountId);

				// Assert
				assert.equal(expectedNftDriverId, 'nft');
				assert.equal(expectedRepoDriverId, 'repo');
				assert.equal(expectedAddressDriverId, 'address');
			});

			it('should throw an error when the driver ID of the user ID is unknown', () => {
				// TODO: Add test case for immutable address driver user ID.

				// Arrange
				let threw = false;

				// Act
				try {
					Utils.AccountId.getDriver('0x5000000000000000000000000000000000000000000000000000000000000000');
				} catch (error: any) {
					// Assert
					assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
					threw = true;
				}

				// Assert
				assert.isTrue(threw, 'Expected type of exception was not thrown');
			});
		});
	});
});
