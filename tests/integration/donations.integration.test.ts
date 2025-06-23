import {describe, it, expect} from 'vitest';
import {createDripsSdk} from '../../src/sdk/createDripsSdk';
import {createWalletClient, http} from 'viem';
import {JsonRpcProvider, Wallet, Contract} from 'ethers';
import {createPinataIpfsUploader} from '../../src/internal/metadata/createPinataIpfsUploader';
import * as dotenv from 'dotenv';
import {expect as expectUntil} from '../../src/internal/shared/expect';
import {privateKeyToAccount} from 'viem/accounts';
import {contractsRegistry} from '../../src/internal/config/contractsRegistry';
import {
  SdkReceiver,
  SdkSplitsReceiver,
} from '../../src/internal/shared/receiverUtils';
import {AMT_PER_SEC_MULTIPLIER} from '../../src/internal/donations/prepareContinuousDonation';
import {
  OneTimeDonationSupport,
  StreamSupport,
} from '../../src/internal/graphql/__generated__/base-types';
import {DripList} from '../../src';
import {randomUUID} from 'crypto';

// Test constants
const TEST_TIMEOUT = 120_000; // 2 minutes
const INDEXING_TIMEOUT = 120_000; // 2 minutes
const POLLING_INTERVAL = 2_000; // 2 seconds
const ONE_MINUTE_MS = 60_000;

dotenv.config();

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

describe('Donations', () => {
  describe('One-Time Donations', () => {
    it(
      'should send a one-time donation to a Drip List using Viem',
      {timeout: TEST_TIMEOUT},

      async () => {
        console.log('=== Sending One-Time Donation with Viem ===');

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
        const ipfsUploader = createPinataIpfsUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK instance
        console.log('Step 4: Creating Drips SDK...');
        const sdk = createDripsSdk(walletClient, ipfsUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!, // optional, we override for testing.
          },
        });

        // Step 5: Create a Drip List to receive donations
        console.log('Step 5: Creating a Drip List to receive donations...');
        const splitsReceivers: SdkSplitsReceiver[] = [
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 100,
          },
        ];

        const {dripListId, txResponse: createTxResponse} =
          await sdk.dripLists.create({
            name: 'Testing One-Time Donation to Drip List with Viem',
            description: 'A drip list to test one-time donations',
            isVisible: true,
            receivers: splitsReceivers,
          });

        console.log(`✓ Drip list created with ID: ${dripListId}`);

        // Step 6: Wait for drip list creation confirmation
        console.log('Step 6: Waiting for drip list creation confirmation...');
        await createTxResponse.wait();
        console.log('✓ Drip list creation confirmed');

        // Step 7: Define the donation parameters
        console.log('Step 7: Defining donation parameters...');
        const oneTimeDonationReceiver: SdkReceiver = {
          type: 'drip-list',
          accountId: dripListId, // The Drip List ID we just created.
        };

        const donationAmount = BigInt(1);
        const erc20Token = process.env.TEST_ERC20_ADDRESS! as `0x${string}`;

        // Step 8: Approve token spending
        console.log('Step 8: Approving token spending...');
        const addressDriverAddress =
          contractsRegistry[localtestnet.id as keyof typeof contractsRegistry]
            .addressDriver.address;

        const approveHash = await walletClient.writeContract({
          address: erc20Token,
          abi: erc20Abi,
          functionName: 'approve',
          args: [addressDriverAddress, donationAmount],
        });

        console.log(
          `✓ Token approval transaction sent with hash: ${approveHash}`,
        );

        // Step 9: Send the one-time donation
        console.log('Step 9: Sending one-time donation...');
        const donationTxResponse = await sdk.donations.sendOneTime({
          receiver: oneTimeDonationReceiver,
          amount: donationAmount,
          erc20: erc20Token,
        });

        console.log('✓ Donation transaction sent');

        // Step 10: Wait for donation transaction confirmation
        console.log(
          'Step 10: Waiting for donation transaction confirmation...',
        );
        const {hash} = await donationTxResponse.wait();
        console.log(`✓ Donation transaction confirmed with hash: ${hash}`);

        // Step 11: Wait for indexing and verify the donation appears in drip list support
        console.log(
          'Step 11: Waiting for indexing and verifying donation support...',
        );

        const result = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList => {
            if (
              !dripList ||
              !dripList.support ||
              dripList.support.length === 0
            ) {
              return false;
            }

            const donation = dripList.support.find(
              (support): support is OneTimeDonationSupport =>
                support.__typename === 'OneTimeDonationSupport',
            );

            return donation !== undefined;
          },
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (result.failed) {
          throw new Error(
            'Donation was not indexed in drip list support within the timeout',
          );
        }

        const dripList = result.result as DripList;

        // Step 12: Verify donation support data
        console.log('Step 12: Verifying donation support data...');
        expect(dripList).not.toBeNull();
        expect(dripList.support).toBeDefined();
        expect(dripList.support.length).toBeGreaterThan(0);

        const oneMinuteAgo = Date.now() - ONE_MINUTE_MS;
        const donation = dripList.support.find(
          (support): support is OneTimeDonationSupport =>
            support.__typename === 'OneTimeDonationSupport' &&
            support.date > oneMinuteAgo,
        ) as OneTimeDonationSupport;

        expect(donation).toBeDefined();
        // Verify the donation is associated with the correct Drip List
        expect(dripList.account.accountId).toBe(dripListId.toString());
        expect(donation.account.address.toLowerCase()).toBe(
          account.address.toLowerCase(),
        );
        expect(donation.amount.amount).toBe(donationAmount.toString());
        expect(donation.amount.tokenAddress.toLowerCase()).toBe(
          erc20Token.toLowerCase(),
        );

        console.log(
          '✓ One-time donation sent and verified successfully with Viem!',
        );
      },
    );

    it(
      'should send a one-time donation to a Drip List using Ethers',
      {timeout: TEST_TIMEOUT},
      async () => {
        console.log('=== Sending One-Time Donation with Ethers ===');

        // Step 1: Set up JSON RPC provider
        console.log('Step 1: Setting up JSON RPC provider...');
        const provider = new JsonRpcProvider(process.env.RPC_URL!);

        // Step 2: Create an Ethers wallet (signer)
        console.log('Step 2: Creating Ethers wallet...');
        const wallet = new Wallet(process.env.DEV_WALLET_PK!, provider);

        // Step 3: Set up IPFS uploader for metadata storage (here we use the Pinata uploader provided by the SDK)
        console.log('Step 3: Setting up IPFS uploader...');
        const ipfsUploader = createPinataIpfsUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK instance
        console.log('Step 4: Creating Drips SDK with Ethers...');
        const sdk = createDripsSdk(wallet, ipfsUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!, // optional, we override for testing.
          },
        });

        // Step 5: Create a Drip List to receive donations
        console.log('Step 5: Creating a Drip List to receive donations...');
        const splitsReceivers: SdkSplitsReceiver[] = [
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 100,
          },
        ];

        const {dripListId, txResponse: createTxResponse} =
          await sdk.dripLists.create({
            name: 'Testing One-Time Donation to Drip List with Ethers',
            description: 'A drip list to test one-time donations',
            isVisible: true,
            receivers: splitsReceivers,
          });

        console.log(`✓ Drip list created with ID: ${dripListId}`);

        // Step 6: Wait for drip list creation confirmation
        console.log('Step 6: Waiting for drip list creation confirmation...');
        await createTxResponse.wait();
        console.log('✓ Drip list creation confirmed');

        // Step 7: Define the donation parameters
        console.log('Step 7: Defining donation parameters...');
        const oneTimeDonationReceiver: SdkReceiver = {
          type: 'drip-list',
          accountId: dripListId, // The Drip List ID we just created.
        };

        const donationAmount = BigInt(1000000); // 1 USDC (6 decimals)
        const erc20Token = process.env.TEST_ERC20_ADDRESS! as `0x${string}`;

        // Step 8: Approve token spending
        console.log('Step 8: Approving token spending...');
        const addressDriverAddress =
          contractsRegistry[localtestnet.id as keyof typeof contractsRegistry]
            .addressDriver.address;

        const erc20Contract = new Contract(
          erc20Token,
          [
            {
              inputs: [
                {
                  internalType: 'address',
                  name: 'spender',
                  type: 'address',
                },
                {
                  internalType: 'uint256',
                  name: 'amount',
                  type: 'uint256',
                },
              ],
              name: 'approve',
              outputs: [{internalType: 'bool', name: '', type: 'bool'}],
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ],
          wallet,
        );

        const currentNonce = await wallet.getNonce('latest');
        const approveTx = await erc20Contract.approve(
          addressDriverAddress,
          donationAmount,
          {nonce: currentNonce},
        );

        console.log(
          `✓ Token approval transaction sent with hash: ${approveTx.hash}`,
        );
        await approveTx.wait();
        console.log('✓ Token approval confirmed');

        // Step 9: Send the one-time donation
        console.log('Step 9: Sending one-time donation...');
        const donationTxResponse = await sdk.donations.sendOneTime({
          receiver: oneTimeDonationReceiver,
          amount: donationAmount,
          erc20: erc20Token,
        });

        console.log('✓ Donation transaction sent');

        // Step 10: Wait for donation transaction confirmation
        console.log(
          'Step 10: Waiting for donation transaction confirmation...',
        );
        const {hash} = await donationTxResponse.wait();
        console.log(`✓ Donation transaction confirmed with hash: ${hash}`);

        // Step 11: Wait for indexing and verify the donation appears in drip list support
        console.log(
          'Step 11: Waiting for indexing and verifying donation support...',
        );

        const result = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList => {
            if (
              !dripList ||
              !dripList.support ||
              dripList.support.length === 0
            ) {
              return false;
            }

            const donation = dripList.support.find(
              (support): support is OneTimeDonationSupport =>
                support.__typename === 'OneTimeDonationSupport',
            );

            return donation !== undefined;
          },
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (result.failed) {
          throw new Error(
            'Donation was not indexed in drip list support within the timeout',
          );
        }

        const dripList = result.result as DripList;

        // Step 12: Verify donation support data
        console.log('Step 12: Verifying donation support data...');
        expect(dripList).not.toBeNull();
        expect(dripList.support).toBeDefined();
        expect(dripList.support.length).toBeGreaterThan(0);

        const oneMinuteAgo = Date.now() - ONE_MINUTE_MS;
        const donation = dripList.support.find(
          (support): support is OneTimeDonationSupport =>
            support.__typename === 'OneTimeDonationSupport' &&
            support.date > oneMinuteAgo,
        ) as OneTimeDonationSupport;

        expect(donation).toBeDefined();
        // Verify the donation is associated with the correct Drip List
        expect(dripList.account.accountId).toBe(dripListId.toString());
        expect(donation.account.address.toLowerCase()).toBe(
          wallet.address.toLowerCase(),
        );
        expect(donation.amount.amount).toBe(donationAmount.toString());
        expect(donation.amount.tokenAddress.toLowerCase()).toBe(
          erc20Token.toLowerCase(),
        );

        console.log(
          '✓ One-time donation sent and verified successfully with Ethers!',
        );
      },
    );
  });

  describe('Continuous Donations', () => {
    it(
      'should send a continuous donation to a Drip List using Viem',
      {timeout: TEST_TIMEOUT},
      async () => {
        console.log(
          '=== Sending Continuous Donation to a Drip List with Viem ===',
        );

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
        const ipfsUploader = createPinataIpfsUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK instance
        console.log('Step 4: Creating Drips SDK...');
        const sdk = createDripsSdk(walletClient, ipfsUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!, // optional, we override for testing.
          },
        });

        // Step 5: Create a Drip List to receive donations
        console.log(
          'Step 5: Creating a drip list to receive continuous donations...',
        );
        const splitsReceivers: SdkSplitsReceiver[] = [
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 100,
          },
        ];

        const {dripListId, txResponse: createTxResponse} =
          await sdk.dripLists.create({
            name: 'Test Continuous Donation Receiver (Viem)',
            description: 'A drip list to test continuous donations',
            isVisible: true,
            receivers: splitsReceivers,
          });

        console.log(`✓ Drip list created with ID: ${dripListId}`);

        // Step 6: Wait for drip list creation confirmation
        console.log('Step 6: Waiting for drip list creation confirmation...');
        await createTxResponse.wait();
        console.log('✓ Drip list creation confirmed');

        // Step 7: Define the continuous donation parameters
        console.log('Step 7: Defining continuous donation parameters...');
        const erc20Token = process.env.TEST_ERC20_ADDRESS! as `0x${string}`;
        const amountPerSec = BigInt(1);
        const durationSeconds = 86400; // 1 day
        const topUpAmount = BigInt(10000000);

        // Step 8: Approve token spending
        console.log('Step 8: Approving token spending...');
        const addressDriverAddress =
          contractsRegistry[localtestnet.id as keyof typeof contractsRegistry]
            .addressDriver.address;

        const approveHash = await walletClient.writeContract({
          address: erc20Token,
          abi: erc20Abi,
          functionName: 'approve',
          args: [addressDriverAddress, topUpAmount],
        });

        console.log(
          `✓ Token approval transaction sent with hash: ${approveHash}`,
        );

        // Step 9: Send the continuous donation
        console.log('Step 9: Sending continuous donation...');
        const streamName = `Test Continuous Donation (Viem) - ${randomUUID()}`;
        const {txResponse} = await sdk.donations.sendContinuous({
          erc20: erc20Token,
          amountPerSec,
          receiver: {
            type: 'drip-list',
            accountId: dripListId,
          },
          name: streamName,
          durationSeconds,
          topUpAmount,
        });

        console.log('✓ Continuous donation transaction sent');

        // Step 10: Wait for donation transaction confirmation
        console.log(
          'Step 10: Waiting for donation transaction confirmation...',
        );
        const {hash} = await txResponse.wait();
        console.log(
          `✓ Continuous donation transaction confirmed with hash: ${hash}`,
        );

        // Step 11: Wait for indexing and verify the continuous donation
        console.log(
          'Step 11: Waiting for indexing and verifying continuous donation...',
        );

        // Check for the stream in the drip list support
        const result = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList => {
            if (
              !dripList ||
              !dripList.support ||
              dripList.support.length === 0
            ) {
              return false;
            }

            const streamSupport = dripList.support.find(
              support =>
                support.__typename === 'StreamSupport' &&
                support.stream.name === streamName,
            ) as StreamSupport;

            return streamSupport !== undefined;
          },
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (result.failed) {
          throw new Error(
            'Continuous donation was not indexed within the timeout',
          );
        }

        const dripList = result.result as DripList;

        // Step 12: Verify continuous donation data
        console.log('Step 12: Verifying continuous donation data...');
        expect(dripList).not.toBeNull();
        expect(dripList.support).toBeDefined();
        expect(dripList.support.length).toBeGreaterThan(0);

        const streamSupport = dripList.support.find(
          support =>
            support.__typename === 'StreamSupport' &&
            support.stream.name === streamName,
        ) as StreamSupport;

        expect(streamSupport).toBeDefined();
        expect(streamSupport.account.address.toLowerCase()).toBe(
          account.address.toLowerCase(),
        );
        expect(
          streamSupport.stream.config.amountPerSecond.tokenAddress.toLowerCase(),
        ).toBe(erc20Token.toLowerCase());
        expect(streamSupport.stream.config.amountPerSecond.amount).toBe(
          (amountPerSec * AMT_PER_SEC_MULTIPLIER).toString(),
        );
        expect(streamSupport.stream.config.durationSeconds).toBe(
          durationSeconds,
        );
        expect(streamSupport.stream.name).toBe(streamName);

        console.log(
          '✓ Continuous donation sent and verified successfully with Viem!',
        );
      },
    );

    it(
      'should send a continuous donation to a Drip List using Ethers',
      {timeout: TEST_TIMEOUT},
      async () => {
        console.log('=== Sending Continuous Donation with Ethers ===');

        // Step 1: Set up JSON RPC provider
        console.log('Step 1: Setting up JSON RPC provider...');
        const provider = new JsonRpcProvider(process.env.RPC_URL!);

        // Step 2: Create an Ethers wallet (signer)
        console.log('Step 2: Creating Ethers wallet...');
        const wallet = new Wallet(process.env.DEV_WALLET_PK!, provider);

        // Step 3: Set up IPFS uploader for metadata storage
        console.log('Step 3: Setting up IPFS uploader...');
        const ipfsUploader = createPinataIpfsUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK instance with Ethers wallet
        console.log('Step 4: Creating Drips SDK with Ethers...');
        const sdk = createDripsSdk(wallet, ipfsUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!, // optional, we override for testing.
          },
        });

        // Step 5: Create a drip list to receive donations
        console.log(
          'Step 5: Creating a drip list to receive continuous donations...',
        );
        const splitsReceivers: SdkSplitsReceiver[] = [
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 100,
          },
        ];

        const {dripListId, txResponse: createTxResponse} =
          await sdk.dripLists.create({
            name: 'Test Continuous Donation Receiver (Ethers)',
            description: 'A drip list to test continuous donations',
            isVisible: true,
            receivers: splitsReceivers,
          });

        console.log(`✓ Drip list created with ID: ${dripListId}`);

        // Step 6: Wait for drip list creation confirmation
        console.log('Step 6: Waiting for drip list creation confirmation...');
        await createTxResponse.wait();
        console.log('✓ Drip list creation confirmed');

        // Step 7: Define the continuous donation parameters
        console.log('Step 7: Defining continuous donation parameters...');
        const erc20Token = process.env.TEST_ERC20_ADDRESS! as `0x${string}`;
        const amountPerSec = BigInt(100); // 100 tokens per second
        const durationSeconds = 86400; // 1 day
        const topUpAmount = BigInt(10000000); // Initial top-up amount

        // Step 8: Approve token spending for the address driver contract
        console.log('Step 8: Approving token spending...');
        const addressDriverAddress =
          contractsRegistry[localtestnet.id as keyof typeof contractsRegistry]
            .addressDriver.address;

        const erc20Contract = new Contract(
          erc20Token,
          [
            {
              inputs: [
                {internalType: 'address', name: 'spender', type: 'address'},
                {internalType: 'uint256', name: 'amount', type: 'uint256'},
              ],
              name: 'approve',
              outputs: [{internalType: 'bool', name: '', type: 'bool'}],
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ],
          wallet,
        );

        const currentNonce = await wallet.getNonce('latest');
        const approveTx = await erc20Contract.approve(
          addressDriverAddress,
          topUpAmount,
          {nonce: currentNonce},
        );

        console.log(
          `✓ Token approval transaction sent with hash: ${approveTx.hash}`,
        );
        await approveTx.wait();
        console.log('✓ Token approval confirmed');

        // Step 9: Send the continuous donation
        console.log('Step 9: Sending continuous donation...');
        const streamName = `Test Continuous Donation (Ethers) - ${randomUUID()}`;
        const {txResponse} = await sdk.donations.sendContinuous({
          erc20: erc20Token,
          amountPerSec,
          receiver: {
            type: 'drip-list',
            accountId: dripListId,
          },
          name: streamName,
          durationSeconds,
          topUpAmount,
        });

        console.log('✓ Continuous donation transaction sent');

        // Step 10: Wait for donation transaction confirmation
        console.log(
          'Step 10: Waiting for donation transaction confirmation...',
        );
        const {hash} = await txResponse.wait();
        console.log(
          `✓ Continuous donation transaction confirmed with hash: ${hash}`,
        );

        // Step 11: Wait for indexing and verify the continuous donation
        console.log(
          'Step 11: Waiting for indexing and verifying continuous donation...',
        );

        // Check for the stream in the drip list support
        const result = await expectUntil(
          () => sdk.dripLists.getById(dripListId, localtestnet.id),
          dripList => {
            if (
              !dripList ||
              !dripList.support ||
              dripList.support.length === 0
            ) {
              return false;
            }

            // Find the stream support from our account with the correct token
            const streamSupport = dripList.support.find(
              support =>
                support.__typename === 'StreamSupport' &&
                support.stream.name === streamName,
            ) as StreamSupport;

            return streamSupport !== undefined;
          },
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (result.failed) {
          throw new Error(
            'Continuous donation was not indexed within the timeout',
          );
        }

        const dripList = result.result as DripList;

        // Step 12: Verify continuous donation data
        console.log('Step 12: Verifying continuous donation data...');
        expect(dripList).not.toBeNull();
        expect(dripList.support).toBeDefined();
        expect(dripList.support.length).toBeGreaterThan(0);

        const streamSupport = dripList.support.find(
          support =>
            support.__typename === 'StreamSupport' &&
            support.stream.name === streamName,
        ) as StreamSupport;

        expect(streamSupport).toBeDefined();
        expect(streamSupport.account.address.toLowerCase()).toBe(
          wallet.address.toLowerCase(),
        );
        expect(
          streamSupport.stream.config.amountPerSecond.tokenAddress.toLowerCase(),
        ).toBe(erc20Token.toLowerCase());
        expect(streamSupport.stream.config.amountPerSecond.amount).toBe(
          (amountPerSec * AMT_PER_SEC_MULTIPLIER).toString(),
        );
        expect(streamSupport.stream.config.durationSeconds).toBe(
          durationSeconds,
        );
        expect(streamSupport.stream.name).toBe(streamName);

        console.log(
          '✓ Continuous donation sent and verified successfully with Viem!',
        );
      },
    );
  });
});
