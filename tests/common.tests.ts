import type { JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import { Wallet } from 'ethers';
import { stubInterface } from 'ts-sinon';
import type { SplitsReceiverStruct } from '../contracts/AddressApp';
import { DripsErrorCode } from '../src/DripsError';
import DripsReceiverConfig from '../src/DripsReceiverConfig';
import type { DripsReceiver } from '../src/types';
import {
	chainIdToNetworkPropertiesMap,
	createErc20Contract,
	getNetworkProperties,
	guardAgainstInvalidAddress,
	guardAgainstInvalidDripsReceiver,
	guardAgainstInvalidSplitsReceiver,
	supportedChainIds
} from '../src/common';

describe('common', () => {
	describe('NetworkProperties', () => {
		it('should export only unique and supported chain IDs', () => {
			// Arrange.
			const chainIds = [5];

			// Assert.
			assert.includeMembers(supportedChainIds as number[], chainIds);
			assert.equal([...new Set(supportedChainIds)].length, [...new Set(chainIds)].length);
		});
	});

	describe('getNetworkProperties', () => {
		it('should return the expected result', () => {
			// Arrange.
			const expectedProps = chainIdToNetworkPropertiesMap[5];

			// Act.
			const actualProps = getNetworkProperties('gOerLi');

			// Assert.
			assert.equal(actualProps, expectedProps);
		});
	});

	describe('createErc20Contract()', () => {
		// Arrange.
		const erc20Address = Wallet.createRandom().address;
		const signerStub = stubInterface<JsonRpcSigner>();

		// Act.
		const result = createErc20Contract(erc20Address, signerStub);

		// Assert.
		assert.equal(result.address, erc20Address);
	});

	describe('guards', () => {
		describe('guardAgainstInvalidAddress()', () => {
			it('should throw invalidArgument error when the input is falsy', () => {
				// Arrange.
				let threw = false;

				// Act.
				try {
					// Act.
					guardAgainstInvalidAddress(undefined as unknown as string);
				} catch (error) {
					// Assert.
					assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
					threw = true;
				}

				// Assert.
				assert.isTrue(threw, "Expected to throw but it didn't");
			});

			it('should throw invalidArgument error when any address is not valid', () => {
				// Arrange.
				let threw = false;
				const addresses = [Wallet.createRandom().address, 'invalid address'];

				// Act.
				try {
					// Act.
					guardAgainstInvalidAddress(...addresses);
				} catch (error) {
					// Assert.
					assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
					threw = true;
				}

				// Assert.
				assert.isTrue(threw, "Expected to throw but it didn't");
			});
		});

		describe('guardAgainstInvalidSplitsReceiver()', () => {
			it('should throw invalidSplitsReceiver error when any receiver user ID is missing', async () => {
				// Arrange.
				let threw = false;
				const receivers: SplitsReceiverStruct[] = [{ userId: undefined as unknown as number, weight: 2 }];

				try {
					// Act.
					guardAgainstInvalidSplitsReceiver(...receivers);
				} catch (error) {
					// Assert.
					assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
					threw = true;
				}

				// Assert.
				assert.isTrue(threw, "Expected to throw but it didn't");
			});

			it('should throw invalidSplitsReceiver error when any receiver weight is missing', async () => {
				// Arrange.
				let threw = false;
				const receivers: SplitsReceiverStruct[] = [
					{
						userId: 1,
						weight: undefined as unknown as number
					}
				];

				try {
					// Act.
					guardAgainstInvalidSplitsReceiver(...receivers);
				} catch (error) {
					// Assert.
					assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
					threw = true;
				}

				// Assert.
				assert.isTrue(threw, "Expected to throw but it didn't");
			});
		});

		describe('guardAgainstInvalidDripsReceiver()', () => {
			it('should throw invalidDripsReceiver error when receivers are more than the max number', async () => {
				// Arrange.
				let threw = false;
				const receivers: DripsReceiver[] = Array(101).fill({
					userId: undefined as unknown as number,
					config: new DripsReceiverConfig(1, 1)
				});

				try {
					// Act.
					guardAgainstInvalidDripsReceiver(...receivers);
				} catch (error) {
					// Assert.
					assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
					threw = true;
				}

				// Assert.
				assert.isTrue(threw, "Expected to throw but it didn't");
			});

			it('should throw invalidDripsReceiver error when any receiver user ID is missing', async () => {
				// Arrange.
				let threw = false;
				const receivers: DripsReceiver[] = [
					{ userId: undefined as unknown as number, config: new DripsReceiverConfig(1, 1) }
				];

				try {
					// Act.
					guardAgainstInvalidDripsReceiver(...receivers);
				} catch (error) {
					// Assert.
					assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
					threw = true;
				}

				// Assert.
				assert.isTrue(threw, "Expected to throw but it didn't");
			});

			it('should throw invalidDripsReceiver error when any receiver config is missing', async () => {
				// Arrange.
				let threw = false;
				const receivers = [
					{
						userId: 1,
						config: undefined as unknown as DripsReceiverConfig
					}
				];

				try {
					// Act.
					guardAgainstInvalidDripsReceiver(...receivers);
				} catch (error) {
					// Assert.
					assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
					threw = true;
				}

				// Assert.
				assert.isTrue(threw, "Expected to throw but it didn't");
			});
		});
	});
});
