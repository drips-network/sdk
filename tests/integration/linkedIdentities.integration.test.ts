import {describe, it, expect} from 'vitest';
import {createDripsSdk} from '../../src/sdk/createDripsSdk';
import {createWalletClient, createPublicClient, http, toHex} from 'viem';
import {JsonRpcProvider, Wallet, NonceManager} from 'ethers';
import {privateKeyToAccount} from 'viem/accounts';
import {contractsRegistry} from '../../src/internal/config/contractsRegistry';
import {repoDriverAbi} from '../../src/internal/abis/repoDriverAbi';
import {dripsAbi} from '../../src/internal/abis/dripsAbi';
import {addressDriverAbi} from '../../src/internal/abis/addressDriverAbi';
import {TOTAL_SPLITS_WEIGHT} from '../../src/internal/shared/receiverUtils';
import {expect as expectUntil} from '../../src/internal/shared/expect';
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

// Matches RepoDriver Forge enum: GitHub=0, GitLab=1, ORCID=2.
const ORCID_FORGE_ID = 2;

// A valid ORCID example with correct checksum.
const ORCID_ID = '0000-0002-1825-0097';

describe('Linked Identities', () => {
  it(
    'should claim an ORCID identity using Viem',
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
      console.log('Step 4: Submitting ORCID claim...');
      const txResponse = await sdk.linkedIdentities.claimOrcid({
        orcidId: ORCID_ID,
      });

      // Step 5: Wait for the transaction confirmation.
      console.log('Step 5: Waiting for transaction confirmation...');
      const {hash} = await txResponse.wait();
      console.log(`✓ Claim transaction confirmed with hash: ${hash}`);

      // Step 6: Compute the RepoDriver accountId for the ORCID and wait until it is owned by the caller.
      console.log('Step 6: Waiting for ownership update on RepoDriver...');
      const repoDriverAddress = contractsRegistry[
        localtestnet.id as keyof typeof contractsRegistry
      ].repoDriver.address as `0x${string}`;

      const accountId = (await publicClient.readContract({
        address: repoDriverAddress,
        abi: repoDriverAbi,
        functionName: 'calcAccountId',
        args: [ORCID_FORGE_ID, toHex(ORCID_ID.trim())],
      })) as bigint;

      const ownerResult = await expectUntil(
        async () =>
          (await publicClient.readContract({
            address: repoDriverAddress,
            abi: repoDriverAbi,
            functionName: 'ownerOf',
            args: [accountId],
          })) as `0x${string}`,
        (owner: `0x${string}`) =>
          owner.toLowerCase() === account.address.toLowerCase(),
        INDEXING_TIMEOUT,
        POLLING_INTERVAL,
        true,
      );

      if (ownerResult.failed) {
        throw new Error('ORCID ownership was not updated within the timeout.');
      }

      const owner = ownerResult.result as `0x${string}`;
      expect(owner.toLowerCase()).toBe(account.address.toLowerCase());
      console.log('✓ ORCID claimed and ownership verified on-chain.');

      // Step 7: Verify splits are set to 100% for the caller's AddressDriver account.
      console.log('Step 7: Verifying splits...');
      const dripsAddress = contractsRegistry[
        localtestnet.id as keyof typeof contractsRegistry
      ].drips.address as `0x${string}`;

      const addressDriverAddress = contractsRegistry[
        localtestnet.id as keyof typeof contractsRegistry
      ].addressDriver.address as `0x${string}`;

      const callerAddressId = (await publicClient.readContract({
        address: addressDriverAddress,
        abi: addressDriverAbi,
        functionName: 'calcAccountId',
        args: [account.address],
      })) as bigint;

      const expectedSplitsHash = (await publicClient.readContract({
        address: dripsAddress,
        abi: dripsAbi,
        functionName: 'hashSplits',
        args: [[{accountId: callerAddressId, weight: TOTAL_SPLITS_WEIGHT}]],
      })) as `0x${string}`;

      const currentSplitsHash = (await publicClient.readContract({
        address: dripsAddress,
        abi: dripsAbi,
        functionName: 'splitsHash',
        args: [accountId],
      })) as `0x${string}`;

      expect(currentSplitsHash).toBe(expectedSplitsHash);
      console.log(
        '✓ Splits hash matches expected single receiver (caller @ 100%).',
      );
    },
  );

  it(
    'should claim an ORCID identity using Ethers',
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
      console.log('Step 3: Submitting ORCID claim...');
      const txResponse = await sdk.linkedIdentities.claimOrcid({
        orcidId: ORCID_ID,
      });

      // Step 4: Wait for the transaction confirmation.
      console.log('Step 4: Waiting for transaction confirmation...');
      const {hash} = await txResponse.wait();
      console.log(`✓ Claim transaction confirmed with hash: ${hash}`);

      // Step 5: Compute the RepoDriver accountId for the ORCID and wait until it is owned by the caller.
      console.log('Step 5: Waiting for ownership update on RepoDriver...');
      const repoDriverAddress = contractsRegistry[
        localtestnet.id as keyof typeof contractsRegistry
      ].repoDriver.address as `0x${string}`;

      const accountId = (await publicClient.readContract({
        address: repoDriverAddress,
        abi: repoDriverAbi,
        functionName: 'calcAccountId',
        args: [ORCID_FORGE_ID, toHex(ORCID_ID.trim())],
      })) as bigint;

      const signerAddress = (await signer.getAddress()) as `0x${string}`;
      const ownerResult = await expectUntil(
        async () =>
          (await publicClient.readContract({
            address: repoDriverAddress,
            abi: repoDriverAbi,
            functionName: 'ownerOf',
            args: [accountId],
          })) as `0x${string}`,
        (owner: `0x${string}`) =>
          owner.toLowerCase() === signerAddress.toLowerCase(),
        INDEXING_TIMEOUT,
        POLLING_INTERVAL,
        true,
      );

      if (ownerResult.failed) {
        throw new Error('ORCID ownership was not updated within the timeout.');
      }

      const onChainOwner = ownerResult.result as string;
      expect(onChainOwner.toLowerCase()).toBe(signerAddress.toLowerCase());
      console.log('✓ ORCID claimed and ownership verified on-chain.');

      // Step 6: Verify splits are set to 100% for the caller's AddressDriver account.
      console.log('Step 6: Verifying splits via hashes...');
      const dripsAddress = contractsRegistry[
        localtestnet.id as keyof typeof contractsRegistry
      ].drips.address as `0x${string}`;
      const addressDriverAddress = contractsRegistry[
        localtestnet.id as keyof typeof contractsRegistry
      ].addressDriver.address as `0x${string}`;

      const callerAddressId = (await publicClient.readContract({
        address: addressDriverAddress,
        abi: addressDriverAbi,
        functionName: 'calcAccountId',
        args: [signerAddress],
      })) as bigint;

      const expectedSplitsHash = (await publicClient.readContract({
        address: dripsAddress,
        abi: dripsAbi,
        functionName: 'hashSplits',
        args: [[{accountId: callerAddressId, weight: TOTAL_SPLITS_WEIGHT}]],
      })) as `0x${string}`;

      const currentSplitsHash = (await publicClient.readContract({
        address: dripsAddress,
        abi: dripsAbi,
        functionName: 'splitsHash',
        args: [accountId],
      })) as `0x${string}`;
      expect(currentSplitsHash).toBe(expectedSplitsHash);
      console.log(
        '✓ Splits hash matches expected single receiver (caller @ 100%).',
      );
    },
  );
});
