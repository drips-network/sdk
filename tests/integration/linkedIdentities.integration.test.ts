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
    'should submit ORCID claim request transaction using Viem',
    {timeout: TEST_TIMEOUT},
    async () => {
      console.log('=== Claiming ORCID with Viem ===');

      // Step 1: Set up wallet account from private key.
      console.log('Step 1: Setting up wallet account...');
      const account = privateKeyToAccount(`0x${process.env.DEV_WALLET_PK!}`);

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

      // Step 3: Create the Drips SDK instance (no IPFS needed for this flow).
      console.log('Step 3: Creating Drips SDK...');
      const sdk = createDripsSdk(walletClient, undefined, {
        graphql: {
          url: process.env.GRAPHQL_URL!, // optional override for testing.
        },
      });

      // Step 4: Submit the ORCID claim transaction.
      console.log('Step 4: Submitting ORCID claim request...');
      const txResponse = await sdk.linkedIdentities.claimOrcid({
        orcidId: ORCID_ID,
      });

      // Step 5: Wait for the transaction confirmation.
      console.log('Step 5: Waiting for transaction confirmation...');
      const {hash} = await txResponse.wait();
      console.log(`✓ Claim request transaction confirmed with hash: ${hash}`);

      // Step 6: Verify transaction receipt and logs.
      console.log('Step 6: Verifying transaction receipt...');
      const receipt = await publicClient.getTransactionReceipt({hash});

      expect(receipt.status).toBe('success');
      expect(receipt.logs.length).toBeGreaterThan(0);
      console.log('✓ Transaction executed successfully with logs emitted.');

      // Step 7: Verify the transaction targeted the Caller contract.
      console.log('Step 7: Verifying transaction structure...');
      const callerAddress = contractsRegistry[
        localtestnet.id as keyof typeof contractsRegistry
      ].caller.address as `0x${string}`;

      expect(receipt.to?.toLowerCase()).toBe(callerAddress.toLowerCase());
      console.log('✓ Transaction correctly targeted Caller contract.');
    },
  );

  it(
    'should submit ORCID claim request transaction using Ethers',
    {timeout: TEST_TIMEOUT},
    async () => {
      console.log('=== Claiming ORCID with Ethers ===');

      // Step 1: Set up JSON RPC provider and signer wallet.
      console.log('Step 1: Setting up provider and wallet...');
      const provider = new JsonRpcProvider(process.env.RPC_URL!);
      const signer = new NonceManager(
        new Wallet(process.env.DEV_WALLET_PK!, provider),
      );

      // Step 2: Create the Drips SDK instance (no IPFS required) and a Viem public client for reads.
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

      // Step 3: Submit the ORCID claim transaction.
      console.log('Step 3: Submitting ORCID claim request...');
      const txResponse = await sdk.linkedIdentities.claimOrcid({
        orcidId: ORCID_ID,
      });

      // Step 4: Wait for the transaction confirmation.
      console.log('Step 4: Waiting for transaction confirmation...');
      const {hash} = await txResponse.wait();
      console.log(`✓ Claim request transaction confirmed with hash: ${hash}`);

      // Step 5: Verify transaction receipt and logs.
      console.log('Step 5: Verifying transaction receipt...');
      const receipt = await publicClient.getTransactionReceipt({hash});

      expect(receipt.status).toBe('success');
      expect(receipt.logs.length).toBeGreaterThan(0);
      console.log('✓ Transaction executed successfully with logs emitted.');

      // Step 6: Verify the transaction targeted the Caller contract.
      console.log('Step 6: Verifying transaction structure...');
      const callerAddress = contractsRegistry[
        localtestnet.id as keyof typeof contractsRegistry
      ].caller.address as `0x${string}`;

      expect(receipt.to?.toLowerCase()).toBe(callerAddress.toLowerCase());
      console.log('✓ Transaction correctly targeted Caller contract.');
    },
  );
});
