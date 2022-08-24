import { assert } from 'chai';
import { BigNumber } from 'ethers';
import sinon from 'ts-sinon';
import type { DripsReceiverStruct, SplitsReceiverStruct } from '../contracts/AddressApp';
import { DripsErrorCode, DripsErrors } from '../src/DripsError';
import type { DripsEntry, SplitEntry } from '../src/types';
import utils from '../src/utils';
import * as common from '../src/common';

describe('utils', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('mapDripEntriesToStructs', () => {
		it('should return the expected result', () => {
			// Arrange.
			const dripsEntry: DripsEntry = {
				id: '1',
				config: '1234',
				receiverUserId: '2'
			};

			// Act.
			const dripStructs: DripsReceiverStruct[] = utils.mapDripEntriesToStructs([dripsEntry]);

			// Assert.
			assert.equal(dripStructs.length, 1);
			assert.equal(dripStructs[0].config, dripsEntry.config);
			assert.equal(dripStructs[0].userId, dripsEntry.receiverUserId);
		});
	});

	describe('mapSplitEntriesToStructs', () => {
		it('should return the expected result', () => {
			// Arrange.
			const splitsEntry: SplitEntry = {
				weight: '1234',
				receiverUserId: '2'
			};

			// Act.
			const dripStructs: SplitsReceiverStruct[] = utils.mapSplitEntriesToStructs([splitsEntry]);

			// Assert.
			assert.equal(dripStructs.length, 1);
			assert.equal(dripStructs[0].weight, splitsEntry.weight);
			assert.equal(dripStructs[0].userId, splitsEntry.receiverUserId);
		});
	});

	describe('destructUserAssetConfigId', () => {
		it('should throw invalidArgument error when configId is missing', () => {
			// Arrange.
			let threw = false;
			const configId = undefined as unknown as string;

			// Act.
			try {
				utils.destructUserAssetConfigId(configId);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should throw invalidArgument error when configId is invalid', () => {
			// Arrange.
			let threw = false;
			const configId = 'invalid';

			// Act.
			try {
				utils.destructUserAssetConfigId(configId);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should return the expected result', () => {
			// Arrange.

			const uId = 'userId';
			const aId = 'assetId';
			const configId = `${uId}-${aId}`;

			// Act.
			const { userId, assetId } = utils.destructUserAssetConfigId(configId);

			// Assert.
			assert.equal(userId, uId);
			assert.equal(assetId, aId);
		});
	});

	describe('getAssetIdFromAddress', () => {
		it('should guard against invalid ERC20 address', () => {
			const erc20Address = 'invalid address';
			const guardAgainstInvalidAddressStub = sinon.stub(common, 'guardAgainstInvalidAddress');
			guardAgainstInvalidAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act.
			try {
				utils.getAssetIdFromAddress(erc20Address);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should return the expected result', () => {
			// Arrange.
			const erc20Address = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

			// Act.
			const assetId = utils.getAssetIdFromAddress(erc20Address);

			// Assert.
			assert.equal(assetId, BigNumber.from(erc20Address).toString());
		});
	});

	describe('getTokenAddressFromAssetId', () => {
		it('should return the expected result', () => {
			// Arrange.
			const assetId = '1033236945445138540915192691692934361059155904726';

			// Act.
			const token = utils.getTokenAddressFromAssetId(assetId);

			// Assert.
			assert.equal(token, BigNumber.from(assetId).toHexString());
		});
	});
});