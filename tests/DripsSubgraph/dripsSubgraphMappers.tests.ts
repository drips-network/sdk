// import { assert } from 'chai';
// import { Wallet } from 'ethers';
// import sinon from 'ts-sinon';
// import { DripsErrorCode } from '../../src/common/DripsError';
// import { toBN } from '../../src/common/internals';
// import type { DripsReceiverConfig } from '../../src/common/types';
// import { toDto, toDtos } from '../../src/DripsSubgraph/dripsSubgraphMappers';
// import type { ApiUserAssetConfig, DripsConfiguration } from '../../src/DripsSubgraph/types';
// import Utils from '../../src/utils';
// import * as dripsSubgraphMappers from '../../src/DripsSubgraph/dripsSubgraphMappers';

// describe('dripsSubgraphMappers', () => {
// 	afterEach(() => {
// 		sinon.restore();
// 	});

// 	describe('toDto()', () => {
// 		it('should throw argumentMissingError when user asset config is missing', () => {
// 			// Arrange
// 			let threw = false;

// 			try {
// 				// Act
// 				toDto(undefined as unknown as ApiUserAssetConfig);
// 			} catch (error: any) {
// 				// Assert
// 				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
// 				threw = true;
// 			}

// 			// Assert
// 			assert.isTrue(threw, 'Expected type of exception was not thrown');
// 		});

// 		it('should return the expected result', () => {
// 			// Arrange
// 			const dripsReceiverConfig: DripsReceiverConfig = {
// 				start: 2,
// 				duration: 3,
// 				amountPerSec: 1
// 			};

// 			const dripsReceiverConfigAsUint256 = Utils.DripsReceiverConfiguration.toUint256String(dripsReceiverConfig);

// 			const userAssetConfig: ApiUserAssetConfig = {
// 				id: '1',
// 				balance: 1,
// 				assetId: '1',
// 				amountCollected: 1,
// 				dripsEntries: [
// 					{
// 						config: dripsReceiverConfigAsUint256,
// 						receiverUserId: '1'
// 					}
// 				],
// 				lastUpdatedBlockTimestamp: 1
// 			};

// 			const erc20TokenAddress = Wallet.createRandom().address;

// 			sinon.stub(Utils.Asset, 'getAddressFromId').returns(erc20TokenAddress);
// 			sinon.stub(Utils.DripsReceiverConfiguration, 'fromUint256').returns(dripsReceiverConfig);

// 			// Act
// 			const dto = toDto(userAssetConfig);

// 			// Assert
// 			assert.equal(dto.id, userAssetConfig.id);
// 			assert.equal(dto.tokenAddress, erc20TokenAddress);
// 			assert.equal(dto.assetId, userAssetConfig.assetId);
// 			assert.equal(dto.balance, userAssetConfig.balance);
// 			assert.equal(dto.amountCollected, userAssetConfig.amountCollected);
// 			assert.equal(dto.lastUpdatedBlockTimestamp, userAssetConfig.lastUpdatedBlockTimestamp);

// 			assert.equal(dto.dripsReceivers[0].receiverUserId, userAssetConfig.dripsEntries[0].receiverUserId);

// 			assert.isTrue(toBN(dto.dripsReceivers[0].config.start).eq(dripsReceiverConfig.start));
// 			assert.isTrue(toBN(dto.dripsReceivers[0].config.duration).eq(dripsReceiverConfig.duration));
// 			assert.isTrue(toBN(dto.dripsReceivers[0].config.amountPerSec).eq(dripsReceiverConfig.amountPerSec));
// 		});
// 	});

// 	describe('toDtos()', () => {
// 		it('should throw argumentMissingError when user asset config is missing', () => {
// 			// Arrange
// 			let threw = false;

// 			try {
// 				// Act
// 				toDtos(undefined as unknown as ApiUserAssetConfig[]);
// 			} catch (error: any) {
// 				// Assert
// 				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
// 				threw = true;
// 			}

// 			// Assert
// 			assert.isTrue(threw, 'Expected type of exception was not thrown');
// 		});

// 		it('should return the expected result', () => {
// 			// Arrange
// 			const userAssetConfigs: ApiUserAssetConfig[] = [
// 				{ id: '1', balance: 1 } as ApiUserAssetConfig,
// 				{ id: '2', balance: 2 } as ApiUserAssetConfig
// 			];

// 			const toDtoStub = sinon
// 				.stub(dripsSubgraphMappers, 'toDto')
// 				.onFirstCall()
// 				.returns({ balance: userAssetConfigs[0].balance } as DripsConfiguration)
// 				.onSecondCall()
// 				.returns({ balance: userAssetConfigs[1].balance } as DripsConfiguration);

// 			// Act
// 			const dtos = toDtos(userAssetConfigs);

// 			// Assert
// 			assert.equal(dtos.length, userAssetConfigs.length);
// 			assert.equal(dtos[0].balance, userAssetConfigs[0].balance);
// 			assert.equal(dtos[1].balance, userAssetConfigs[1].balance);
// 			assert(toDtoStub.calledTwice, 'Expected method to be called twice');
// 		});
// 	});
// });
