import { assert } from 'chai';
import { BigNumber, ethers } from 'ethers';
import sinon from 'ts-sinon';
import type { DripsReceiverStruct, SplitsReceiverStruct } from '../contracts/AddressApp';
import { chainIdToNetworkPropertiesMap } from '../src/common';
import { DripsErrorCode, DripsErrors } from '../src/DripsError';
import type { Drip, Split } from '../src/types';
import utils from '../src/utils';
import * as common from '../src/common';
import DripsReceiverConfig from '../src/DripsReceiverConfig';

describe('utils', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('mapDripEntriesToStructs()', () => {
		it('should return the expected result', () => {
			// Arrange
			const Drip: Drip = {
				id: '1',
				config: new DripsReceiverConfig(1, 1, 1),
				receiverUserId: '2'
			};

			// Act
			const dripStructs: DripsReceiverStruct[] = utils.mapDripEntriesToStructs([Drip]);

			// Assert
			assert.equal(dripStructs.length, 1);
			assert.isTrue(BigNumber.from(dripStructs[0].config).eq(Drip.config.asUint256));
			assert.isTrue(BigNumber.from(dripStructs[0].userId).eq(Drip.receiverUserId));
		});
	});

	describe('getNetworkProperties()', () => {
		it('should return the expected result', () => {
			// Arrange
			const expectedProps = chainIdToNetworkPropertiesMap[5];

			// Act
			const actualProps = utils.getNetworkProperties('gOerLi');

			// Assert
			assert.deepEqual(actualProps, expectedProps);
		});
	});

	describe('mapSplitEntriesToStructs()', () => {
		it('should return the expected result', () => {
			// Arrange
			const splitsEntry: Split = {
				weight: '1234',
				receiverUserId: '2'
			};

			// Act
			const dripStructs: SplitsReceiverStruct[] = utils.mapSplitEntriesToStructs([splitsEntry]);

			// Assert
			assert.equal(dripStructs.length, 1);
			assert.equal(dripStructs[0].weight, splitsEntry.weight);
			assert.equal(dripStructs[0].userId, splitsEntry.receiverUserId);
		});
	});

	describe('destructUserAssetConfigId()', () => {
		it('should throw invalidArgument error when configId is missing', () => {
			// Arrange
			let threw = false;
			const configId = undefined as unknown as string;

			// Act
			try {
				utils.destructUserAssetConfigId(configId);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should throw invalidArgument error when configId is invalid', () => {
			// Arrange
			let threw = false;
			const configId = 'invalid';

			// Act
			try {
				utils.destructUserAssetConfigId(configId);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should return the expected result', () => {
			// Arrange

			const uId = 'userId';
			const aId = 'assetId';
			const configId = `${uId}-${aId}`;

			// Act
			const { userId, assetId } = utils.destructUserAssetConfigId(configId);

			// Assert
			assert.equal(userId, uId);
			assert.equal(assetId, aId);
		});
	});

	describe('getAssetIdFromAddress()', () => {
		it('should validate ERC20 address', () => {
			const erc20Address = 'invalid address';
			const validateAddressStub = sinon.stub(common.validators, 'validateAddress');
			validateAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act
			try {
				utils.getAssetIdFromAddress(erc20Address);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should return the expected result', () => {
			// Arrange
			const erc20Address = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

			// Act
			const assetId = utils.getAssetIdFromAddress(erc20Address);

			// Assert
			assert.equal(assetId, BigNumber.from(erc20Address).toString());
		});
	});

	describe('getTokenAddressFromAssetId()', () => {
		it('should return the expected result', () => {
			// Arrange
			const assetId = '1033236945445138540915192691692934361059155904726';

			// Act
			const token = utils.getTokenAddressFromAssetId(assetId);

			// Assert
			assert.equal(token, ethers.utils.getAddress(BigNumber.from(assetId).toHexString()));
		});
	});

	describe('constructUserAssetConfigId()', () => {
		it('should throw invalidArgument error when user ID is missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				utils.constructUserAssetConfigId(undefined as unknown as string, 'assetId');
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should throw invalidArgument error when asset ID is missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				utils.constructUserAssetConfigId('userId', undefined as unknown as string);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should return the expected result', async () => {
			// Arrange

			// Act
			const configId = utils.constructUserAssetConfigId('userId', 'assetId');

			// Assert
			assert.equal(configId, 'userId-assetId');
		});
	});
});
