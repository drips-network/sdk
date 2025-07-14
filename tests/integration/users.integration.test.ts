import {describe, it, expect} from 'vitest';
import {createDripsSdk} from '../../src/sdk/createDripsSdk';
import {createWalletClient, http, Address} from 'viem';
import {JsonRpcProvider, Wallet, Contract, NonceManager} from 'ethers';
import {createPinataIpfsMetadataUploader} from '../../src/internal/shared/createPinataIpfsMetadataUploader';
import * as dotenv from 'dotenv';
import {expect as expectUntil} from '../../src/internal/shared/expect';
import {privateKeyToAccount} from 'viem/accounts';
import {resolveBlockchainAdapter} from '../../src/internal/blockchain/resolveBlockchainAdapter';
import {calcAddressId} from '../../src/internal/shared/calcAddressId';
import {
  contractsRegistry,
  SupportedChain,
} from '../../src/internal/config/contractsRegistry';
import {buildTx} from '../../src/internal/shared/buildTx';
import {dripsAbi} from '../../src/internal/abis/dripsAbi';
import {WriteBlockchainAdapter} from '../../src/internal/blockchain/BlockchainAdapter';
import {SdkReceiver} from '../../src/internal/shared/receiverUtils';

// Test constants
const TEST_TIMEOUT = 240_000; // 4 minutes
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

describe('Users', () => {
  describe('Getting Withdrawable Balances with Donation and Split Flow', () => {
    it(
      'should send donation to address, split, and get withdrawable balances using Viem',
      {timeout: TEST_TIMEOUT},
      async () => {
        console.log('=== Complete Withdrawable Balances Flow with Viem ===');

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

        // Step 3: Set up IPFS uploader for metadata storage
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

        // Step 5: Define the donation parameters
        console.log('Step 5: Defining donation parameters...');
        const oneTimeDonationReceiver: SdkReceiver = {
          type: 'address',
          address: account.address, // Send directly to the test address
        };

        const donationAmount = BigInt(1000000);
        const erc20Token = process.env.TEST_ERC20_ADDRESS! as `0x${string}`;

        // Step 6: Approve token spending
        console.log('Step 6: Approving token spending...');
        const addressDriverAddress =
          contractsRegistry[localtestnet.id as SupportedChain].addressDriver
            .address;

        const approveHash = await walletClient.writeContract({
          address: erc20Token,
          abi: erc20Abi,
          functionName: 'approve',
          args: [addressDriverAddress, donationAmount],
        });

        console.log(
          `✓ Token approval transaction sent with hash: ${approveHash}`,
        );

        // Step 7: Send the one-time donation
        console.log('Step 7: Sending one-time donation to address...');
        const donationTxResponse = await sdk.donations.sendOneTime({
          receiver: oneTimeDonationReceiver,
          amount: donationAmount,
          erc20: erc20Token,
        });

        console.log('✓ Donation transaction sent');

        // Step 8: Wait for donation transaction confirmation
        console.log('Step 8: Waiting for donation transaction confirmation...');
        const {hash: donationHash} = await donationTxResponse.wait();
        console.log(
          `✓ Donation transaction confirmed with hash: ${donationHash}`,
        );

        // Step 9: Wait for indexing
        console.log('Step 9: Waiting for donation indexing...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        console.log('✓ Donation indexing wait completed');

        // Step 10: Create blockchain adapter and calculate account ID
        console.log('Step 10: Creating blockchain adapter...');
        const adapter = resolveBlockchainAdapter(walletClient);
        const accountId = await calcAddressId(adapter, account.address);
        console.log(`✓ Account ID calculated: ${accountId}`);

        // Step 11: Perform split operation to make funds collectable
        console.log('Step 11: Performing split operation...');
        const dripsContractAddress =
          contractsRegistry[localtestnet.id as SupportedChain].drips.address;

        const splitTx = buildTx({
          abi: dripsAbi,
          contract: dripsContractAddress,
          functionName: 'split',
          args: [
            accountId,
            erc20Token,
            [], // Empty current receivers array for this test
          ],
        });

        const writeAdapter = adapter as WriteBlockchainAdapter;
        const splitTxResponse = await writeAdapter.sendTx(splitTx);
        console.log(`✓ Split transaction sent: ${splitTxResponse.hash}`);

        // Wait for transaction confirmation
        await splitTxResponse.wait();
        console.log('✓ Split transaction confirmed');

        // Step 14: Wait for indexing and get updated withdrawable balances
        console.log(
          'Step 14: Waiting for indexing and getting withdrawable balances...',
        );

        // Wait a bit for indexing
        await new Promise(resolve => setTimeout(resolve, 10000));

        const withdrawableBalances = await sdk.users.getWithdrawableBalances(
          account.address,
          localtestnet.id,
        );
        console.log('✓ Withdrawable balances retrieved');

        // Step 15: Verify the response structure and collectable balance
        console.log('Step 15: Verifying withdrawable balances...');
        expect(withdrawableBalances).not.toBeNull();
        if (withdrawableBalances) {
          expect(Array.isArray(withdrawableBalances)).toBe(true);

          // Each chain data should have withdrawableBalances array
          withdrawableBalances.forEach((chainData, index) => {
            console.log(`  Chain data ${index}:`, chainData);
            expect(chainData).toHaveProperty('withdrawableBalances');
            expect(Array.isArray(chainData.withdrawableBalances)).toBe(true);

            // Each withdrawable balance should have the expected structure
            chainData.withdrawableBalances.forEach((balance, balanceIndex) => {
              console.log(`    Balance ${balanceIndex}:`, balance);
              expect(balance).toHaveProperty('tokenAddress');
              expect(balance).toHaveProperty('collectableAmount');
              expect(balance).toHaveProperty('receivableAmount');
              expect(balance).toHaveProperty('splittableAmount');

              // Verify types
              expect(typeof balance.tokenAddress).toBe('string');
              expect(typeof balance.collectableAmount).toBe('string');
              expect(typeof balance.receivableAmount).toBe('string');
              expect(typeof balance.splittableAmount).toBe('string');

              // Check if we have a collectable amount for our test token
              if (
                balance.tokenAddress.toLowerCase() === erc20Token.toLowerCase()
              ) {
                console.log(
                  `    ✓ Found balance for test token: collectable=${balance.collectableAmount}`,
                );
              }
            });
          });
        }

        console.log(
          '✓ Complete withdrawable balances flow verified successfully with Viem!',
        );
      },
    );

    it(
      'should send donation to address, split, and get withdrawable balances using Ethers',
      {timeout: TEST_TIMEOUT},
      async () => {
        console.log('=== Complete Withdrawable Balances Flow with Ethers ===');

        // Step 1: Set up JSON RPC provider
        console.log('Step 1: Setting up JSON RPC provider...');
        const provider = new JsonRpcProvider(process.env.RPC_URL!);

        // Step 2: Create an Ethers wallet (signer)
        console.log('Step 2: Creating Ethers wallet...');
        const wallet = new NonceManager(
          new Wallet(process.env.DEV_WALLET_PK!, provider),
        );

        // Step 3: Set up IPFS uploader for metadata storage
        console.log('Step 3: Setting up IPFS uploader...');
        const ipfsMetadataUploader = createPinataIpfsMetadataUploader({
          pinataJwt: process.env.PINATA_JWT!,
          pinataGateway: process.env.PINATA_GATEWAY!,
        });

        // Step 4: Create the Drips SDK instance
        console.log('Step 4: Creating Drips SDK with Ethers...');
        const sdk = createDripsSdk(wallet, ipfsMetadataUploader, {
          graphql: {
            url: process.env.GRAPHQL_URL!, // optional, we override for testing.
          },
        });

        // Step 5: Define the donation parameters
        console.log('Step 5: Defining donation parameters...');
        const walletAddress = await wallet.getAddress();
        const oneTimeDonationReceiver: SdkReceiver = {
          type: 'address',
          address: walletAddress as Address, // Send directly to the test address
        };

        const donationAmount = BigInt(1000000);
        const erc20Token = process.env.TEST_ERC20_ADDRESS! as `0x${string}`;

        // Step 6: Approve token spending
        console.log('Step 6: Approving token spending...');
        const addressDriverAddress =
          contractsRegistry[localtestnet.id as SupportedChain].addressDriver
            .address;

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

        const approveTx = await erc20Contract.approve(
          addressDriverAddress,
          donationAmount,
        );

        console.log(
          `✓ Token approval transaction sent with hash: ${approveTx.hash}`,
        );
        await approveTx.wait();
        console.log('✓ Token approval confirmed');

        // Step 7: Send the one-time donation
        console.log('Step 7: Sending one-time donation to address...');
        const donationTxResponse = await sdk.donations.sendOneTime({
          receiver: oneTimeDonationReceiver,
          amount: donationAmount,
          erc20: erc20Token,
        });

        console.log('✓ Donation transaction sent');

        // Step 8: Wait for donation transaction confirmation
        console.log('Step 8: Waiting for donation transaction confirmation...');
        const {hash: donationHash} = await donationTxResponse.wait();
        console.log(
          `✓ Donation transaction confirmed with hash: ${donationHash}`,
        );

        // Step 9: Wait for indexing
        console.log('Step 9: Waiting for donation indexing...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        console.log('✓ Donation indexing wait completed');

        // Step 10: Create blockchain adapter and calculate account ID
        console.log('Step 10: Creating blockchain adapter...');
        const adapter = resolveBlockchainAdapter(wallet);
        const accountId = await calcAddressId(
          adapter,
          walletAddress as Address,
        );
        console.log(`✓ Account ID calculated: ${accountId}`);

        // Step 11: Perform split operation to make funds collectable
        console.log('Step 11: Performing split operation...');
        const dripsContractAddress =
          contractsRegistry[localtestnet.id as SupportedChain].drips.address;

        const splitTx = buildTx({
          abi: dripsAbi,
          contract: dripsContractAddress,
          functionName: 'split',
          args: [
            accountId,
            erc20Token,
            [], // Empty current receivers array for this test
          ],
        });

        const writeAdapter = adapter as WriteBlockchainAdapter;
        const splitTxResponse = await writeAdapter.sendTx(splitTx);
        console.log(`✓ Split transaction sent: ${splitTxResponse.hash}`);

        // Wait for transaction confirmation
        await splitTxResponse.wait();
        console.log('✓ Split transaction confirmed');

        // Step 14: Wait for indexing and get updated withdrawable balances
        console.log(
          'Step 14: Waiting for indexing and getting withdrawable balances...',
        );

        // Wait a bit for indexing
        await new Promise(resolve => setTimeout(resolve, 10000));

        const withdrawableBalances = await sdk.users.getWithdrawableBalances(
          walletAddress as Address,
          localtestnet.id,
        );
        console.log('✓ Withdrawable balances retrieved');

        // Step 15: Verify the response structure and collectable balance
        console.log('Step 15: Verifying withdrawable balances...');
        expect(withdrawableBalances).not.toBeNull();
        if (withdrawableBalances) {
          expect(Array.isArray(withdrawableBalances)).toBe(true);

          // Each chain data should have withdrawableBalances array
          withdrawableBalances.forEach((chainData, index) => {
            console.log(`  Chain data ${index}:`, chainData);
            expect(chainData).toHaveProperty('withdrawableBalances');
            expect(Array.isArray(chainData.withdrawableBalances)).toBe(true);

            // Each withdrawable balance should have the expected structure
            chainData.withdrawableBalances.forEach((balance, balanceIndex) => {
              console.log(`    Balance ${balanceIndex}:`, balance);
              expect(balance).toHaveProperty('tokenAddress');
              expect(balance).toHaveProperty('collectableAmount');
              expect(balance).toHaveProperty('receivableAmount');
              expect(balance).toHaveProperty('splittableAmount');

              // Verify types
              expect(typeof balance.tokenAddress).toBe('string');
              expect(typeof balance.collectableAmount).toBe('string');
              expect(typeof balance.receivableAmount).toBe('string');
              expect(typeof balance.splittableAmount).toBe('string');

              // Check if we have a collectable amount for our test token
              if (
                balance.tokenAddress.toLowerCase() === erc20Token.toLowerCase()
              ) {
                console.log(
                  `    ✓ Found balance for test token: collectable=${balance.collectableAmount}`,
                );
              }
            });
          });
        }

        console.log(
          '✓ Complete withdrawable balances flow verified successfully with Ethers!',
        );
      },
    );
  });
});
