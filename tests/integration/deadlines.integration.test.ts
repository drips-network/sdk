import {describe, it, expect} from 'vitest';
import {createDripsSdk} from '../../src/sdk/createDripsSdk';
import {createWalletClient, createPublicClient, http, parseUnits} from 'viem';
import {JsonRpcProvider, Wallet, NonceManager, Contract} from 'ethers';
import {privateKeyToAccount} from 'viem/accounts';
import {contractsRegistry} from '../../src/internal/config/contractsRegistry';
import {repoDeadlineDriverAbi} from '../../src/internal/abis/repoDeadlineDriver';
import {dripsAbi} from '../../src/internal/abis/dripsAbi';
import {TOTAL_SPLITS_WEIGHT} from '../../src/internal/shared/receiverUtils';
import {expect as expectUntil} from '../../src/internal/shared/expect';
import {createPinataIpfsMetadataUploader} from '../../src/internal/shared/createPinataIpfsMetadataUploader';
import {SdkSplitsReceiver} from '../../src/internal/shared/receiverUtils';
import {toDeadlineSeconds} from '../../src/internal/shared/toDeadlineSeconds';
import {calcProjectId} from '../../src/internal/projects/calcProjectId';
import {calcAddressId} from '../../src/internal/shared/calcAddressId';
import {resolveBlockchainAdapter} from '../../src/internal/blockchain/resolveBlockchainAdapter';
import {randomUUID} from 'crypto';
import * as dotenv from 'dotenv';

// Test constants
const TEST_TIMEOUT = 120_000; // 2 minutes
const INDEXING_TIMEOUT = 120_000; // 2 minutes
const POLLING_INTERVAL = 2_000; // 2 seconds

dotenv.config();

// Local testnet chain (31337)
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
} as const;

// ERC20 ABI for approve function
const erc20Abi = [
  {
    inputs: [
      {name: 'spender', type: 'address'},
      {name: 'amount', type: 'uint256'},
    ],
    name: 'approve',
    outputs: [{name: '', type: 'bool'}],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

describe('Deadlines', () => {
  describe('Drip List with Deadline', () => {
    it(
      'should create a Drip List with deadline and verify splits hash using Viem',
      {timeout: TEST_TIMEOUT},
      async () => {
        console.log('=== Creating Drip List with Deadline using Viem ===');

        // Step 1: Set up wallet account
        console.log('Step 1: Setting up wallet account...');
        const account = privateKeyToAccount(`0x${process.env.DEV_WALLET_PK!}`);

        // Step 2: Create Viem clients
        console.log('Step 2: Creating Viem clients...');
        const walletClient = createWalletClient({
          chain: localtestnet,
          transport: http(process.env.RPC_URL!),
          account,
        });

        const publicClient = createPublicClient({
          chain: localtestnet,
          transport: http(process.env.RPC_URL!),
        });

        // Step 3: Set up IPFS uploader
        console.log('Step 3: Setting up IPFS uploader...');
        const ipfsMetadataUploader = createPinataIpfsMetadataUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK
        console.log('Step 4: Creating Drips SDK...');
        const sdk = createDripsSdk(walletClient, ipfsMetadataUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!,
          },
        });

        // Step 5: Define receivers with deadline config
        console.log('Step 5: Defining receivers with deadline...');
        const projectUrl = 'https://github.com/drips-network/sdk';
        const receivers: SdkSplitsReceiver[] = [
          {
            type: 'project',
            url: projectUrl,
            weight: TOTAL_SPLITS_WEIGHT,
          },
        ];

        const deadline = new Date(Date.now() + 86400000); // 1 day from now
        const refundAddress = account.address;

        // Step 6: Create Drip List with deadline
        console.log('Step 6: Creating Drip List with deadline...');
        const dripListName = `Test Deadline Drip List (Viem) - ${randomUUID()}`;
        const {dripListId, txResponse} = await sdk.dripLists.create({
          name: dripListName,
          description: 'A drip list to test deadlines',
          isVisible: true,
          receivers,
          deadlineConfig: {
            deadline,
            refundAddress,
          },
        });

        console.log(`✓ Drip list created with ID: ${dripListId}`);

        // Step 7: Wait for transaction confirmation
        console.log('Step 7: Waiting for transaction confirmation...');
        const {hash} = await txResponse.wait();
        console.log(`✓ Transaction confirmed with hash: ${hash}`);

        // Step 8: Wait for indexing
        console.log('Step 8: Waiting for indexing...');
        const result = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList => dripList !== null && dripList.name === dripListName,
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (result.failed) {
          throw new Error('Drip list was not indexed within the timeout');
        }

        // Step 9: Verify splits hash
        console.log('Step 9: Verifying splits hash...');
        const dripsAddress = contractsRegistry[
          localtestnet.id as keyof typeof contractsRegistry
        ].drips.address as `0x${string}`;

        const repoDeadlineDriverAddress = contractsRegistry[
          localtestnet.id as keyof typeof contractsRegistry
        ].repoDeadlineDriver.address as `0x${string}`;

        // Calculate project account ID
        const adapter = resolveBlockchainAdapter(walletClient);
        const repoAccountId = await calcProjectId(adapter, {
          forge: 'github',
          name: 'drips-network/sdk',
        });

        const refundAccountId = await calcAddressId(adapter, refundAddress);
        const deadlineSeconds = toDeadlineSeconds(deadline);

        // Calculate deadline driver account ID
        const deadlineAccountId = (await publicClient.readContract({
          address: repoDeadlineDriverAddress,
          abi: repoDeadlineDriverAbi,
          functionName: 'calcAccountId',
          args: [
            repoAccountId,
            repoAccountId,
            refundAccountId,
            deadlineSeconds,
          ],
        })) as bigint;

        // Calculate expected splits hash using deadline account ID
        const expectedSplitsHash = (await publicClient.readContract({
          address: dripsAddress,
          abi: dripsAbi,
          functionName: 'hashSplits',
          args: [[{accountId: deadlineAccountId, weight: TOTAL_SPLITS_WEIGHT}]],
        })) as `0x${string}`;

        // Get actual splits hash from Drip List
        const currentSplitsHash = (await publicClient.readContract({
          address: dripsAddress,
          abi: dripsAbi,
          functionName: 'splitsHash',
          args: [dripListId],
        })) as `0x${string}`;

        expect(currentSplitsHash).toBe(expectedSplitsHash);
        console.log(
          '✓ Splits hash matches expected deadline driver account ID.',
        );
      },
    );

    it(
      'should create a Drip List with deadline and verify splits hash using Ethers',
      {timeout: TEST_TIMEOUT},
      async () => {
        console.log('=== Creating Drip List with Deadline using Ethers ===');

        // Step 1: Set up provider and wallet
        console.log('Step 1: Setting up provider and wallet...');
        const provider = new JsonRpcProvider(process.env.RPC_URL!);
        const signer = new NonceManager(
          new Wallet(process.env.DEV_WALLET_PK!, provider),
        );

        // Step 2: Create public client for reads
        console.log('Step 2: Creating public client...');
        const publicClient = createPublicClient({
          chain: localtestnet,
          transport: http(process.env.RPC_URL!),
        });

        // Step 3: Set up IPFS uploader
        console.log('Step 3: Setting up IPFS uploader...');
        const ipfsMetadataUploader = createPinataIpfsMetadataUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK
        console.log('Step 4: Creating Drips SDK...');
        const sdk = createDripsSdk(signer, ipfsMetadataUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!,
          },
        });

        // Step 5: Define receivers with deadline config
        console.log('Step 5: Defining receivers with deadline...');
        const projectUrl = 'https://github.com/drips-network/sdk';
        const receivers: SdkSplitsReceiver[] = [
          {
            type: 'project',
            url: projectUrl,
            weight: TOTAL_SPLITS_WEIGHT,
          },
        ];

        const deadline = new Date(Date.now() + 86400000); // 1 day from now
        const refundAddress = (await signer.getAddress()) as `0x${string}`;

        // Step 6: Create Drip List with deadline
        console.log('Step 6: Creating Drip List with deadline...');
        const dripListName = `Test Deadline Drip List (Ethers) - ${randomUUID()}`;
        const {dripListId, txResponse} = await sdk.dripLists.create({
          name: dripListName,
          description: 'A drip list to test deadlines',
          isVisible: true,
          receivers,
          deadlineConfig: {
            deadline,
            refundAddress,
          },
        });

        console.log(`✓ Drip list created with ID: ${dripListId}`);

        // Step 7: Wait for transaction confirmation
        console.log('Step 7: Waiting for transaction confirmation...');
        const {hash} = await txResponse.wait();
        console.log(`✓ Transaction confirmed with hash: ${hash}`);

        // Step 8: Wait for indexing
        console.log('Step 8: Waiting for indexing...');
        const result = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList => dripList !== null && dripList.name === dripListName,
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (result.failed) {
          throw new Error('Drip list was not indexed within the timeout');
        }

        // Step 9: Verify splits hash
        console.log('Step 9: Verifying splits hash...');
        const dripsAddress = contractsRegistry[
          localtestnet.id as keyof typeof contractsRegistry
        ].drips.address as `0x${string}`;

        const repoDeadlineDriverAddress = contractsRegistry[
          localtestnet.id as keyof typeof contractsRegistry
        ].repoDeadlineDriver.address as `0x${string}`;

        // Calculate project account ID
        const adapter = resolveBlockchainAdapter(signer);
        const repoAccountId = await calcProjectId(adapter, {
          forge: 'github',
          name: 'drips-network/sdk',
        });

        const refundAccountId = await calcAddressId(adapter, refundAddress);
        const deadlineSeconds = toDeadlineSeconds(deadline);

        // Calculate deadline driver account ID
        const deadlineAccountId = (await publicClient.readContract({
          address: repoDeadlineDriverAddress,
          abi: repoDeadlineDriverAbi,
          functionName: 'calcAccountId',
          args: [
            repoAccountId,
            repoAccountId,
            refundAccountId,
            deadlineSeconds,
          ],
        })) as bigint;

        // Calculate expected splits hash using deadline account ID
        const expectedSplitsHash = (await publicClient.readContract({
          address: dripsAddress,
          abi: dripsAbi,
          functionName: 'hashSplits',
          args: [[{accountId: deadlineAccountId, weight: TOTAL_SPLITS_WEIGHT}]],
        })) as `0x${string}`;

        // Get actual splits hash from Drip List
        const currentSplitsHash = (await publicClient.readContract({
          address: dripsAddress,
          abi: dripsAbi,
          functionName: 'splitsHash',
          args: [dripListId],
        })) as `0x${string}`;

        expect(currentSplitsHash).toBe(expectedSplitsHash);
        console.log(
          '✓ Splits hash matches expected deadline driver account ID.',
        );
      },
    );
  });

  // TODO: Add tests for one-time donations with deadlines when SDK supports claiming a project: https://github.com/drips-network/sdk/issues/166
});
