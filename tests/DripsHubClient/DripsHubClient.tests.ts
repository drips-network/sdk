import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import type { DripsHub } from '../../contracts';
import { DripsHub__factory } from '../../contracts';
import Utils from '../../src/utils';
import { DripsErrorCode } from '../../src/common/DripsError';

describe('DripsHubClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let providerStub: StubbedInstance<JsonRpcProvider>;
	let dripsHubContractStub: StubbedInstance<DripsHub>;

	let testDripsHubClient: DripsHubClient;

	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		dripsHubContractStub = stubInterface<DripsHub>();

		sinon
			.stub(DripsHub__factory, 'connect')
			.withArgs(Utils.Network.chainDripsMetadata[TEST_CHAIN_ID].CONTRACT_DRIPS_HUB, providerStub)
			.returns(dripsHubContractStub);

		testDripsHubClient = await DripsHubClient.create(providerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should throw argumentMissingError error when the provider is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await DripsHubClient.create(undefined as unknown as JsonRpcProvider);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw unsupportedNetworkError error when the provider is connected to an unsupported chain', async () => {
			// Arrange
			let threw = false;
			providerStub.getNetwork.resolves({ chainId: TEST_CHAIN_ID + 1 } as Network);

			try {
				// Act
				await DripsHubClient.create(providerStub);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.UNSUPPORTED_NETWORK);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testDripsHubClient.network.chainId, networkStub.chainId);
			assert.equal(await testDripsHubClient.provider.getNetwork(), networkStub);
			assert.equal(
				testDripsHubClient.chainDripsMetadata,
				Utils.Network.chainDripsMetadata[(await providerStub.getNetwork()).chainId]
			);
		});
	});
});
