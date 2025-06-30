import {describe, it, expect} from 'vitest';
import {createDripsSdk} from '../../src/sdk/createDripsSdk';
import {createWalletClient, http} from 'viem';
import {JsonRpcProvider, Wallet} from 'ethers';
import {createPinataIpfsMetadataUploader} from '../../src/internal/shared/createPinataIpfsMetadataUploader';
import * as dotenv from 'dotenv';
import {expect as expectUntil} from '../../src/internal/shared/expect';
import {graphqlChainMap} from '../../src/internal/config/graphqlChainMap';
import {privateKeyToAccount} from 'viem/accounts';
import {SdkSplitsReceiver} from '../../src/internal/shared/receiverUtils';
import {calcProjectId} from '../../src/internal/projects/calcProjectId';
import {calcAddressId} from '../../src/internal/shared/calcAddressId';
import {resolveBlockchainAdapter} from '../../src/internal/blockchain/resolveBlockchainAdapter';
import {randomUUID} from 'crypto';

// Test constants
const TEST_TIMEOUT = 120_000; // 2 minutes
const TEST_TIMEOUT_LONG = 240_000; // 4 minutes
const INDEXING_TIMEOUT = 120_000; // 2 minutes
const POLLING_INTERVAL = 2_000; // 2 seconds

dotenv.config();

const localtestnet = {
  name: 'Local Testnet',
  id: 31337,
  rpcUrls: {
    default: {http: [process.env.RPC_URL!]},
  },
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
};

describe('Drip Lists', () => {
  describe('Creating Drip Lists', () => {
    it(
      'should create a Drip List using Viem',
      {timeout: TEST_TIMEOUT},
      async () => {
        console.log('=== Creating Drip List with Viem ===');

        // Step 1: Set up your wallet account (here we use a private key)
        console.log('Step 1: Setting up wallet account...');
        const account = privateKeyToAccount(`0x${process.env.DEV_WALLET_PK!}`);

        // Step 2: Create a Viem wallet client
        console.log('Step 2: Creating Viem wallet client...');
        const walletClient = createWalletClient({
          chain: localtestnet,
          transport: http(process.env.RPC_URL!),
          account,
        });

        // Step 3: Set up IPFS uploader for metadata storage (here we use the Pinata uploader provided by the SDK)
        console.log('Step 3: Setting up IPFS uploader...');
        const ipfsMetadataUploader = createPinataIpfsMetadataUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK instance
        console.log('Step 4: Creating Drips SDK...');
        const sdk = createDripsSdk(walletClient, ipfsMetadataUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!, // optional, we override for testing.
          },
        });

        // Step 5: Define the split receivers (who gets the funds)
        console.log('Step 5: Defining split receivers...');
        const receivers: SdkSplitsReceiver[] = [
          {
            type: 'project',
            url: 'https://github.com/drips-network/sdk',
            weight: 500_000, // 50% weight
          },
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 500_000, // 50% weight
          },
        ];

        // Step 6: Create the drip list
        console.log('Step 6: Creating drip list...');
        const dripListName = `Test Drip List (Viem) - ${randomUUID()}`;
        const {dripListId, salt, ipfsHash, txResponse} =
          await sdk.dripLists.create({
            name: dripListName,
            description: 'A test drip list created using Viem adapter',
            isVisible: true,
            receivers,
          });

        console.log(
          `✓ Drip list created with ID: ${dripListId}, salt: ${salt}, IPFS hash: ${ipfsHash}`,
        );

        // Step 7: Wait for transaction confirmation
        console.log('Step 7: Waiting for transaction confirmation...');
        const {hash} = await txResponse.wait();
        console.log(`✓ Transaction confirmed with hash: ${hash}`);

        // Step 8: Wait for indexing and verify the drip list
        console.log('Step 8: Waiting for indexing and verifying...');
        const result = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList =>
            dripList !== null &&
            dripList.name === dripListName &&
            dripList.description ===
              'A test drip list created using Viem adapter',
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (result.failed) {
          throw new Error('Drip list was not indexed within the timeout');
        }

        const dripList = result.result;

        // Step 9: Verify all fields
        console.log('Step 9: Verifying drip list fields...');
        expect(dripList).not.toBeNull();
        expect(dripList?.name).toBe(dripListName);
        expect(dripList?.description).toBe(
          'A test drip list created using Viem adapter',
        );
        expect(dripList?.isVisible).toBe(true);
        expect(dripList?.account.accountId).toBe(dripListId.toString());
        expect(dripList?.latestMetadataIpfsHash).toBe(ipfsHash);
        expect(dripList?.chain).toBe(
          graphqlChainMap[localtestnet.id as keyof typeof graphqlChainMap],
        );
        expect(dripList?.owner).not.toBeNull();
        expect(dripList?.owner.address?.toLocaleLowerCase()).toBe(
          account.address.toLowerCase(),
        );

        console.log('✓ All drip list fields verified successfully with Viem!');
      },
    );

    it(
      'should create a Drip List using Ethers',
      {timeout: TEST_TIMEOUT},
      async () => {
        console.log('=== Creating Drip List with Ethers ===');

        // Step 1: Set up JSON RPC provider
        console.log('Step 1: Setting up JSON RPC provider...');
        const provider = new JsonRpcProvider(process.env.RPC_URL!);

        // Step 2: Create an Ethers wallet (signer)
        console.log('Step 2: Creating Ethers wallet...');
        const wallet = new Wallet(process.env.DEV_WALLET_PK!, provider);

        // Step 3: Set up IPFS uploader for metadata storage (here we use the Pinata uploader provided by the SDK)
        console.log('Step 3: Setting up IPFS uploader...');
        const ipfsMetadataUploader = createPinataIpfsMetadataUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK instance with Ethers wallet
        console.log('Step 4: Creating Drips SDK with Ethers...');
        const sdk = createDripsSdk(wallet, ipfsMetadataUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!, // optional, we override for testing.
          },
        });

        // Step 5: Define the split receivers (who gets the funds)
        console.log('Step 5: Defining split receivers...');
        const receivers: SdkSplitsReceiver[] = [
          {
            type: 'project',
            url: 'https://github.com/drips-network/sdk',
            weight: 500_000, // 50% weight
          },
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 500_000, // 50% weight
          },
        ];

        // Step 6: Create the drip list
        console.log('Step 6: Creating drip list...');
        const dripListName = `Test Drip List (Ethers) - ${randomUUID()}`;
        const {dripListId, salt, ipfsHash, txResponse} =
          await sdk.dripLists.create({
            name: dripListName,
            description: 'A test drip list created using Ethers adapter',
            isVisible: true,
            receivers,
          });

        console.log(
          `✓ Drip list created with ID: ${dripListId}, salt: ${salt}, IPFS hash: ${ipfsHash}`,
        );

        // Step 7: Wait for transaction confirmation
        console.log('Step 7: Waiting for transaction confirmation...');
        const {hash} = await txResponse.wait();
        console.log(`✓ Transaction confirmed with hash: ${hash}`);

        // Step 8: Wait for indexing and verify the drip list
        console.log('Step 8: Waiting for indexing and verifying...');
        const result = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList =>
            dripList !== null &&
            dripList.name === dripListName &&
            dripList.description ===
              'A test drip list created using Ethers adapter',
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (result.failed) {
          throw new Error('Drip list was not indexed within the timeout');
        }

        const dripList = result.result;

        // Step 9: Verify all fields
        console.log('Step 9: Verifying drip list fields...');
        expect(dripList).not.toBeNull();
        expect(dripList?.name).toBe(dripListName);
        expect(dripList?.description).toBe(
          'A test drip list created using Ethers adapter',
        );
        expect(dripList?.isVisible).toBe(true);
        expect(dripList?.account.accountId).toBe(dripListId.toString());
        expect(dripList?.latestMetadataIpfsHash).toBe(ipfsHash);
        expect(dripList?.chain).toBe(
          graphqlChainMap[localtestnet.id as keyof typeof graphqlChainMap],
        );
        expect(dripList?.owner).not.toBeNull();
        expect(dripList?.owner.address?.toLocaleLowerCase()).toBe(
          wallet.address.toLowerCase(),
        );

        console.log(
          '✓ All drip list fields verified successfully with Ethers!',
        );
      },
    );
  });

  describe('Updating Drip Lists', () => {
    it(
      'should update a Drip List using Viem',
      {timeout: TEST_TIMEOUT_LONG},
      async () => {
        console.log('=== Updating Drip List with Viem ===');

        // Step 1: Set up your wallet account (here we use a private key)
        console.log('Step 1: Setting up wallet account...');
        const account = privateKeyToAccount(`0x${process.env.DEV_WALLET_PK!}`);

        // Step 2: Create a Viem wallet client
        console.log('Step 2: Creating Viem wallet client...');
        const walletClient = createWalletClient({
          chain: localtestnet,
          transport: http(process.env.RPC_URL!),
          account,
        });

        // Step 3: Set up IPFS uploader for metadata storage (here we use the Pinata uploader provided by the SDK)
        console.log('Step 3: Setting up IPFS uploader...');
        const ipfsMetadataUploader = createPinataIpfsMetadataUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK instance
        console.log('Step 4: Creating Drips SDK...');
        const sdk = createDripsSdk(walletClient, ipfsMetadataUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!, // optional, we override for testing.
          },
        });

        // Step 5: Define the initial split receivers (who gets the funds)
        console.log('Step 5: Defining initial split receivers...');
        const initialReceivers: SdkSplitsReceiver[] = [
          {
            type: 'project',
            url: 'https://github.com/drips-network/sdk',
            weight: 500_000, // 50% weight
          },
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 500_000, // 50% weight
          },
        ];

        // Step 6: Create the initial drip list
        console.log('Step 6: Creating initial drip list...');
        const initialDripListName = `Test Drip List for Update (Viem) - ${randomUUID()}`;
        const {
          dripListId,
          salt,
          ipfsHash: initialIpfsHash,
          txResponse: createTxResponse,
        } = await sdk.dripLists.create({
          name: initialDripListName,
          description: 'Initial drip list to be updated using Viem adapter',
          isVisible: true,
          receivers: initialReceivers,
        });

        console.log(
          `✓ Initial drip list created with ID: ${dripListId}, salt: ${salt}, IPFS hash: ${initialIpfsHash}`,
        );

        // Step 7: Wait for initial creation transaction confirmation
        console.log(
          'Step 7: Waiting for initial creation transaction confirmation...',
        );
        const {hash: createHash} = await createTxResponse.wait();
        console.log(
          `✓ Initial creation transaction confirmed with hash: ${createHash}`,
        );

        // Step 8: Wait for initial indexing
        console.log('Step 8: Waiting for initial indexing...');
        const initialResult = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList =>
            dripList !== null && dripList.name === initialDripListName,
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (initialResult.failed) {
          throw new Error(
            'Initial drip list was not indexed within the timeout',
          );
        }

        // Step 9: Define updated metadata and receivers
        console.log('Step 9: Defining updated metadata and receivers...');
        const updatedDripListName = `Updated Test Drip List (Viem) - ${randomUUID()}`;
        const updatedReceivers: SdkSplitsReceiver[] = [
          {
            type: 'project',
            url: 'https://github.com/drips-network/sdk',
            weight: 300_000, // 30% weight (changed)
          },
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 400_000, // 40% weight (changed)
          },
          {
            type: 'address',
            address: '0x1234567890123456789012345678901234567890',
            weight: 300_000, // 30% weight (new receiver)
          },
        ];

        // Step 10: Update the drip list
        console.log('Step 10: Updating drip list...');
        const {
          ipfsHash: updatedIpfsHash,
          metadata: updatedMetadata,
          txResponse: updateTxResponse,
        } = await sdk.dripLists.update({
          dripListId,
          metadata: {
            name: updatedDripListName,
            description: 'Updated drip list description using Viem adapter',
            isVisible: false, // changed visibility
          },
          receivers: updatedReceivers,
        });

        console.log(
          `✓ Drip list updated with new IPFS hash: ${updatedIpfsHash}`,
        );

        // Step 11: Wait for update transaction confirmation
        console.log('Step 11: Waiting for update transaction confirmation...');
        const {hash: updateHash} = await updateTxResponse.wait();
        console.log(`✓ Update transaction confirmed with hash: ${updateHash}`);

        // Step 12: Wait for indexing and verify the updated drip list
        console.log(
          'Step 12: Waiting for indexing and verifying updated drip list...',
        );
        const updateResult = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList =>
            dripList !== null &&
            dripList.name === updatedDripListName &&
            dripList.description ===
              'Updated drip list description using Viem adapter' &&
            dripList.isVisible === false &&
            dripList.latestMetadataIpfsHash === updatedIpfsHash,
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (updateResult.failed) {
          throw new Error(
            'Updated drip list was not indexed within the timeout',
          );
        }

        const updatedDripList = updateResult.result;

        // Step 13: Verify all updated fields
        console.log('Step 13: Verifying updated drip list fields...');
        expect(updatedDripList).not.toBeNull();
        expect(updatedDripList?.name).toBe(updatedDripListName);
        expect(updatedDripList?.description).toBe(
          'Updated drip list description using Viem adapter',
        );
        expect(updatedDripList?.isVisible).toBe(false);
        expect(updatedDripList?.account.accountId).toBe(dripListId.toString());
        expect(updatedDripList?.latestMetadataIpfsHash).toBe(updatedIpfsHash);
        expect(updatedDripList?.latestMetadataIpfsHash).not.toBe(
          initialIpfsHash,
        );
        expect(updatedDripList?.chain).toBe(
          graphqlChainMap[localtestnet.id as keyof typeof graphqlChainMap],
        );
        expect(updatedDripList?.owner).not.toBeNull();
        expect(updatedDripList?.owner.address?.toLocaleLowerCase()).toBe(
          account.address.toLowerCase(),
        );

        // Verify splits were updated (should have 3 receivers now)
        expect(updatedDripList?.splits).toHaveLength(3);

        // Step 14: Verify splits have expected account IDs and weights
        console.log('Step 14: Verifying splits account IDs and weights...');

        // Create blockchain adapter for account ID calculations
        const adapter = resolveBlockchainAdapter(walletClient);

        // Calculate expected account IDs for verification
        const expectedProjectAccountId = await calcProjectId(adapter, {
          forge: 'github',
          name: 'drips-network/sdk',
        });
        const expectedAddressAccountId1 = await calcAddressId(
          adapter,
          '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
        );
        const expectedAddressAccountId2 = await calcAddressId(
          adapter,
          '0x1234567890123456789012345678901234567890',
        );

        // Sort splits by account ID for consistent comparison
        const sortedSplits = [...updatedDripList!.splits].sort((a, b) =>
          BigInt(a.account.accountId) > BigInt(b.account.accountId) ? 1 : -1,
        );

        // Verify each split has the expected account ID and weight
        const expectedSplits = [
          {accountId: expectedProjectAccountId, weight: 300_000},
          {accountId: expectedAddressAccountId1, weight: 400_000},
          {accountId: expectedAddressAccountId2, weight: 300_000},
        ].sort((a, b) => (a.accountId > b.accountId ? 1 : -1));

        for (let i = 0; i < expectedSplits.length; i++) {
          expect(sortedSplits[i].account.accountId).toBe(
            expectedSplits[i].accountId.toString(),
          );
          expect(sortedSplits[i].weight).toBe(expectedSplits[i].weight);
        }

        console.log(
          '✓ All updated drip list fields and splits verified successfully with Viem!',
        );
      },
    );

    it(
      'should update a Drip List using Ethers',
      {timeout: TEST_TIMEOUT},
      async () => {
        console.log('=== Updating Drip List with Ethers ===');

        // Step 1: Set up JSON RPC provider
        console.log('Step 1: Setting up JSON RPC provider...');
        const provider = new JsonRpcProvider(process.env.RPC_URL!);

        // Step 2: Create an Ethers wallet (signer)
        console.log('Step 2: Creating Ethers wallet...');
        const wallet = new Wallet(process.env.DEV_WALLET_PK!, provider);

        // Step 3: Set up IPFS uploader for metadata storage (here we use the Pinata uploader provided by the SDK)
        console.log('Step 3: Setting up IPFS uploader...');
        const ipfsMetadataUploader = createPinataIpfsMetadataUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK instance with Ethers wallet
        console.log('Step 4: Creating Drips SDK with Ethers...');
        const sdk = createDripsSdk(wallet, ipfsMetadataUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!, // optional, we override for testing.
          },
        });

        // Step 5: Define the initial split receivers (who gets the funds)
        console.log('Step 5: Defining initial split receivers...');
        const initialReceivers: SdkSplitsReceiver[] = [
          {
            type: 'project',
            url: 'https://github.com/drips-network/sdk',
            weight: 500_000, // 50% weight
          },
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 500_000, // 50% weight
          },
        ];

        // Step 6: Create the initial drip list
        console.log('Step 6: Creating initial drip list...');
        const initialDripListName = `Test Drip List for Update (Ethers) - ${randomUUID()}`;
        const {
          dripListId,
          salt,
          ipfsHash: initialIpfsHash,
          txResponse: createTxResponse,
        } = await sdk.dripLists.create({
          name: initialDripListName,
          description: 'Initial drip list to be updated using Ethers adapter',
          isVisible: true,
          receivers: initialReceivers,
        });

        console.log(
          `✓ Initial drip list created with ID: ${dripListId}, salt: ${salt}, IPFS hash: ${initialIpfsHash}`,
        );

        // Step 7: Wait for initial creation transaction confirmation
        console.log(
          'Step 7: Waiting for initial creation transaction confirmation...',
        );
        const {hash: createHash} = await createTxResponse.wait();
        console.log(
          `✓ Initial creation transaction confirmed with hash: ${createHash}`,
        );

        // Step 8: Wait for initial indexing
        console.log('Step 8: Waiting for initial indexing...');
        const initialResult = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList =>
            dripList !== null && dripList.name === initialDripListName,
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (initialResult.failed) {
          throw new Error(
            'Initial drip list was not indexed within the timeout',
          );
        }

        // Step 9: Define updated metadata and receivers
        console.log('Step 9: Defining updated metadata and receivers...');
        const updatedDripListName = `Updated Test Drip List (Ethers) - ${randomUUID()}`;
        const updatedReceivers: SdkSplitsReceiver[] = [
          {
            type: 'project',
            url: 'https://github.com/drips-network/sdk',
            weight: 300_000, // 30% weight (changed)
          },
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 400_000, // 40% weight (changed)
          },
          {
            type: 'address',
            address: '0x1234567890123456789012345678901234567890',
            weight: 300_000, // 30% weight (new receiver)
          },
        ];

        // Step 10: Update the drip list
        console.log('Step 10: Updating drip list...');
        const {
          ipfsHash: updatedIpfsHash,
          metadata: updatedMetadata,
          txResponse: updateTxResponse,
        } = await sdk.dripLists.update({
          dripListId,
          metadata: {
            name: updatedDripListName,
            description: 'Updated drip list description using Ethers adapter',
            isVisible: false, // changed visibility
          },
          receivers: updatedReceivers,
        });

        console.log(
          `✓ Drip list updated with new IPFS hash: ${updatedIpfsHash}`,
        );

        // Step 11: Wait for update transaction confirmation
        console.log('Step 11: Waiting for update transaction confirmation...');
        const {hash: updateHash} = await updateTxResponse.wait();
        console.log(`✓ Update transaction confirmed with hash: ${updateHash}`);

        // Step 12: Wait for indexing and verify the updated drip list
        console.log(
          'Step 12: Waiting for indexing and verifying updated drip list...',
        );
        const updateResult = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList =>
            dripList !== null &&
            dripList.name === updatedDripListName &&
            dripList.description ===
              'Updated drip list description using Ethers adapter' &&
            dripList.isVisible === false &&
            dripList.latestMetadataIpfsHash === updatedIpfsHash,
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (updateResult.failed) {
          throw new Error(
            'Updated drip list was not indexed within the timeout',
          );
        }

        const updatedDripList = updateResult.result;

        // Step 13: Verify all updated fields
        console.log('Step 13: Verifying updated drip list fields...');
        expect(updatedDripList).not.toBeNull();
        expect(updatedDripList?.name).toBe(updatedDripListName);
        expect(updatedDripList?.description).toBe(
          'Updated drip list description using Ethers adapter',
        );
        expect(updatedDripList?.isVisible).toBe(false);
        expect(updatedDripList?.account.accountId).toBe(dripListId.toString());
        expect(updatedDripList?.latestMetadataIpfsHash).toBe(updatedIpfsHash);
        expect(updatedDripList?.latestMetadataIpfsHash).not.toBe(
          initialIpfsHash,
        );
        expect(updatedDripList?.chain).toBe(
          graphqlChainMap[localtestnet.id as keyof typeof graphqlChainMap],
        );
        expect(updatedDripList?.owner).not.toBeNull();
        expect(updatedDripList?.owner.address?.toLocaleLowerCase()).toBe(
          wallet.address.toLowerCase(),
        );

        // Verify splits were updated (should have 3 receivers now)
        expect(updatedDripList?.splits).toHaveLength(3);

        // Step 14: Verify splits have expected account IDs and weights
        console.log('Step 14: Verifying splits account IDs and weights...');

        // Create blockchain adapter for account ID calculations
        const adapter = resolveBlockchainAdapter(wallet);

        // Calculate expected account IDs for verification
        const expectedProjectAccountId = await calcProjectId(adapter, {
          forge: 'github',
          name: 'drips-network/sdk',
        });
        const expectedAddressAccountId1 = await calcAddressId(
          adapter,
          '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
        );
        const expectedAddressAccountId2 = await calcAddressId(
          adapter,
          '0x1234567890123456789012345678901234567890',
        );

        // Sort splits by account ID for consistent comparison
        const sortedSplits = [...updatedDripList!.splits].sort((a, b) =>
          BigInt(a.account.accountId) > BigInt(b.account.accountId) ? 1 : -1,
        );

        // Verify each split has the expected account ID and weight
        const expectedSplits = [
          {accountId: expectedProjectAccountId, weight: 300_000},
          {accountId: expectedAddressAccountId1, weight: 400_000},
          {accountId: expectedAddressAccountId2, weight: 300_000},
        ].sort((a, b) => (a.accountId > b.accountId ? 1 : -1));

        for (let i = 0; i < expectedSplits.length; i++) {
          expect(sortedSplits[i].account.accountId).toBe(
            expectedSplits[i].accountId.toString(),
          );
          expect(sortedSplits[i].weight).toBe(expectedSplits[i].weight);
        }

        console.log(
          '✓ All updated drip list fields and splits verified successfully with Ethers!',
        );
      },
    );
  });
});
