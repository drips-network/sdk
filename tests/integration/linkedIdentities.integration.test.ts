import {describe, it, expect} from 'vitest';
import {createDripsSdk} from '../../src/sdk/createDripsSdk';
import {createWalletClient, createPublicClient, http} from 'viem';
import {JsonRpcProvider, Wallet, NonceManager} from 'ethers';
import {privateKeyToAccount} from 'viem/accounts';
import {contractsRegistry} from '../../src/internal/config/contractsRegistry';
import * as dotenv from 'dotenv';

// Test constants
const TEST_TIMEOUT = 120_000; // 2 minutes

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

// A valid ORCID example with correct checksum.
const ORCID_ID = '0000-0002-1825-0097';

describe('Linked Identities', () => {
  it(
    'should complete full ORCID claim flow using Viem',
    {timeout: TEST_TIMEOUT},
    async () => {
      console.log('=== Testing Complete ORCID Claim Flow with Viem ===');

      // Step 1: Set up wallet account from private key.
      console.log('Step 1: Setting up wallet account...');
      const account = privateKeyToAccount(`0x${process.env.DEV_WALLET_PK!}`);
      const ownerAddress = account.address;

      // Step 2: Create Viem wallet and public clients.
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

      // Step 3: Create the Drips SDK instance.
      console.log('Step 3: Creating Drips SDK...');
      const sdk = createDripsSdk(walletClient, undefined, {
        graphql: {
          url: process.env.GRAPHQL_URL!,
        },
      });

      // Step 4: Calculate ORCID account ID before claiming.
      console.log('Step 4: Calculating ORCID account ID...');
      const orcidAccountId = await sdk.utils.calcOrcidAccountId(ORCID_ID);
      console.log(`✓ ORCID Account ID: ${orcidAccountId}`);

      // Step 5: Start the claim process with progress tracking.
      console.log('Step 5: Starting ORCID claim flow...');
      const progressSteps: string[] = [];

      const result = await sdk.linkedIdentities.claimOrcid({
        orcidId: ORCID_ID,
        onProgress: async event => {
          console.log(`  → ${event.step}`);
          progressSteps.push(event.step);

          // When we reach the waiting phase, log instructions for manual script execution.
          if (event.step === 'waiting') {
            console.log('\n⏸️  PAUSED: Waiting for ownership update...');
            console.log(
              '📝 Manually run the update-repo-owner.sh script with:',
            );
            console.log(
              `account ID ${orcidAccountId} and ownerAddress ${ownerAddress}`,
            );
            console.log('⏳ Polling for ownership confirmation...\n');
          }
        },
        waitOptions: {
          pollIntervalMs: 1000, // Poll every second
          timeoutMs: 60000, // 1 minute timeout
        },
      });

      console.log(
        `✓ ORCID claimed successfully. Account ID: ${result.orcidAccountId}`,
      );
      console.log(`✓ Overall status: ${result.status}`);

      // Step 6: Verify all progress steps were called.
      console.log('Step 6: Verifying progress flow...');
      expect(progressSteps).toEqual(['claiming', 'waiting', 'configuring']);
      console.log('✓ All progress steps completed in correct order.');

      // Step 7: Verify result status and structure.
      console.log('Step 7: Verifying result structure...');
      expect(result.status).toBe('complete');
      expect(result.claim.success).toBe(true);
      expect(result.ownership.success).toBe(true);
      expect(result.splits.success).toBe(true);
      expect(result.orcidAccountId).toBe(orcidAccountId);
      console.log('✓ All steps succeeded.');

      // Step 8: Verify transaction receipts.
      console.log('Step 8: Verifying transaction receipts...');
      if (result.claim.success && result.splits.success) {
        const claimReceipt = await publicClient.getTransactionReceipt({
          hash: result.claim.data.hash,
        });
        const setSplitsReceipt = await publicClient.getTransactionReceipt({
          hash: result.splits.data.hash,
        });

        expect(claimReceipt.status).toBe('success');
        expect(setSplitsReceipt.status).toBe('success');
        expect(result.claim.data.mined).toBe(true);
        expect(result.splits.data.mined).toBe(true);
        console.log('✓ Both transactions executed successfully.');

        // Step 9: Verify transactions targeted the RepoDriver contract.
        console.log('Step 9: Verifying transaction structure...');
        const repoDriverAddress = contractsRegistry[
          localtestnet.id as keyof typeof contractsRegistry
        ].repoDriver.address as `0x${string}`;

        expect(claimReceipt.to?.toLowerCase()).toBe(
          repoDriverAddress.toLowerCase(),
        );
        expect(setSplitsReceipt.to?.toLowerCase()).toBe(
          repoDriverAddress.toLowerCase(),
        );
        console.log('✓ Transactions correctly targeted RepoDriver contract.');
      }

      // Step 10: Verify ownership data.
      console.log('Step 10: Verifying ownership data...');
      if (result.ownership.success) {
        expect(result.ownership.data.owner.toLowerCase()).toBe(
          ownerAddress.toLowerCase(),
        );
        expect(result.ownership.data.verificationTimeMs).toBeGreaterThan(0);
        console.log(
          `✓ Ownership verified in ${result.ownership.data.verificationTimeMs}ms`,
        );
      }

      console.log(
        '\n=== Full ORCID Claim Flow Test Completed Successfully ===',
      );
    },
  );

  it(
    'should complete full ORCID claim flow using Ethers',
    {timeout: TEST_TIMEOUT},
    async () => {
      console.log('=== Testing Complete ORCID Claim Flow with Ethers ===');

      // Step 1: Set up JSON RPC provider and signer wallet.
      console.log('Step 1: Setting up provider and wallet...');
      const provider = new JsonRpcProvider(process.env.RPC_URL!);
      const signer = new NonceManager(
        new Wallet(process.env.DEV_WALLET_PK!, provider),
      );
      const ownerAddress = await signer.getAddress();

      // Step 2: Create the Drips SDK instance and Viem public client.
      console.log('Step 2: Creating Drips SDK and Viem public client...');
      const sdk = createDripsSdk(signer, undefined, {
        graphql: {
          url: process.env.GRAPHQL_URL!,
        },
      });
      const publicClient = createPublicClient({
        chain: localtestnet,
        transport: http(process.env.RPC_URL!),
      });

      // Step 3: Calculate ORCID account ID before claiming.
      console.log('Step 3: Calculating ORCID account ID...');
      const orcidAccountId = await sdk.utils.calcOrcidAccountId(ORCID_ID);
      console.log(`✓ ORCID Account ID: ${orcidAccountId}`);

      // Step 4: Start the claim process with progress tracking.
      console.log('Step 4: Starting ORCID claim flow...');
      const progressSteps: string[] = [];

      const result = await sdk.linkedIdentities.claimOrcid({
        orcidId: ORCID_ID,
        onProgress: async event => {
          console.log(`  → ${event.step}`);
          progressSteps.push(event.step);

          // When we reach the waiting phase, log instructions for manual script execution.
          if (event.step === 'waiting') {
            console.log('\n⏸️  PAUSED: Waiting for ownership update...');
            console.log(
              '📝 Manually run the update-repo-owner.sh script with:',
            );
            console.log(
              `   account ID ${orcidAccountId} and ownerAddress ${ownerAddress}`,
            );
            console.log('⏳ Polling for ownership confirmation...\n');
          }
        },
        waitOptions: {
          pollIntervalMs: 1000, // Poll every second
          timeoutMs: 60000, // 1 minute timeout
        },
      });

      console.log(
        `✓ ORCID claimed successfully. Account ID: ${result.orcidAccountId}`,
      );
      console.log(`✓ Overall status: ${result.status}`);

      // Step 5: Verify all progress steps were called.
      console.log('Step 5: Verifying progress flow...');
      expect(progressSteps).toEqual(['claiming', 'waiting', 'configuring']);
      console.log('✓ All progress steps completed in correct order.');

      // Step 6: Verify result status and structure.
      console.log('Step 6: Verifying result structure...');
      expect(result.status).toBe('complete');
      expect(result.claim.success).toBe(true);
      expect(result.ownership.success).toBe(true);
      expect(result.splits.success).toBe(true);
      expect(result.orcidAccountId).toBe(orcidAccountId);
      console.log('✓ All steps succeeded.');

      // Step 7: Verify transaction receipts.
      console.log('Step 7: Verifying transaction receipts...');
      if (result.claim.success && result.splits.success) {
        const claimReceipt = await publicClient.getTransactionReceipt({
          hash: result.claim.data.hash,
        });
        const setSplitsReceipt = await publicClient.getTransactionReceipt({
          hash: result.splits.data.hash,
        });

        expect(claimReceipt.status).toBe('success');
        expect(setSplitsReceipt.status).toBe('success');
        expect(result.claim.data.mined).toBe(true);
        expect(result.splits.data.mined).toBe(true);
        console.log('✓ Both transactions executed successfully.');

        // Step 8: Verify transactions targeted the RepoDriver contract.
        console.log('Step 8: Verifying transaction structure...');
        const repoDriverAddress = contractsRegistry[
          localtestnet.id as keyof typeof contractsRegistry
        ].repoDriver.address as `0x${string}`;

        expect(claimReceipt.to?.toLowerCase()).toBe(
          repoDriverAddress.toLowerCase(),
        );
        expect(setSplitsReceipt.to?.toLowerCase()).toBe(
          repoDriverAddress.toLowerCase(),
        );
        console.log('✓ Transactions correctly targeted RepoDriver contract.');
      }

      // Step 9: Verify ownership data.
      console.log('Step 9: Verifying ownership data...');
      if (result.ownership.success) {
        expect(result.ownership.data.owner.toLowerCase()).toBe(
          ownerAddress.toLowerCase(),
        );
        expect(result.ownership.data.verificationTimeMs).toBeGreaterThan(0);
        console.log(
          `✓ Ownership verified in ${result.ownership.data.verificationTimeMs}ms`,
        );
      }

      console.log(
        '\n=== Full ORCID Claim Flow Test Completed Successfully ===',
      );
    },
  );
});
