import {describe, it, expect} from 'vitest';
import {createDripsSdk} from '../../src/sdk/createDripsSdk';
import {
  createWalletClient,
  createPublicClient,
  http,
  Address,
  parseUnits,
} from 'viem';
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

// ERC20 ABI for approve and balanceOf functions
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
  {
    inputs: [{name: 'account', type: 'address'}],
    name: 'balanceOf',
    outputs: [{name: '', type: 'uint256'}],
    stateMutability: 'view',
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

describe('Collect', () => {
  describe('Collecting Funds', () => {
    it('should collect using Viem', {timeout: TEST_TIMEOUT}, async () => {
      console.log('=== Donation, Split, and Indexing Flow with Viem ===');

      // Step 1: Set up your wallet account (here we use a private key)
      console.log('Step 1: Setting up wallet account...');
      const account = privateKeyToAccount(`0x${process.env.DEV_WALLET_PK!}`);

      // Step 2: Create a Viem wallet client and public client
      console.log('Step 2: Creating Viem wallet client and public client...');
      const walletClient = createWalletClient({
        chain: localtestnet,
        transport: http(process.env.RPC_URL!),
        account,
      });

      const publicClient = createPublicClient({
        chain: localtestnet,
        transport: http(process.env.RPC_URL!),
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

      // Step 5: Query collectable balances before donation
      console.log('Step 5: Querying collectable balances before donation...');
      const initialWithdrawableBalances =
        await sdk.funds.getWithdrawableBalances(localtestnet.id);
      console.log('✓ Initial withdrawable balances retrieved');

      const erc20Token = process.env.TEST_ERC20_ADDRESS! as Address;
      let initialCollectableAmount = BigInt(0);

      initialWithdrawableBalances.forEach(chainData => {
        chainData.withdrawableBalances.forEach(balance => {
          if (balance.tokenAddress.toLowerCase() === erc20Token.toLowerCase()) {
            initialCollectableAmount = BigInt(balance.collectableAmount);
            console.log(
              `  Initial collectable amount for ${balance.tokenAddress}: ${balance.collectableAmount}`,
            );
          }
        });
      });

      // Step 6: Define the donation parameters
      console.log('Step 6: Defining donation parameters...');
      const oneTimeDonationReceiver: SdkReceiver = {
        type: 'address',
        address: account.address,
      };

      const donationAmount = 1n; // 1 token

      // Step 7: Approve token spending
      console.log('Step 7: Approving token spending...');
      const addressDriverAddress =
        contractsRegistry[localtestnet.id as SupportedChain].addressDriver
          .address;

      const approveHash = await walletClient.writeContract({
        address: erc20Token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [addressDriverAddress, parseUnits(donationAmount.toString(), 18)],
      });

      console.log(
        `✓ Token approval transaction sent with hash: ${approveHash}`,
      );

      // Step 8: Send the one-time donation
      console.log('Step 8: Sending one-time donation to address...');
      const donationTxResponse = await sdk.donations.sendOneTime({
        receiver: oneTimeDonationReceiver,
        amount: donationAmount,
        erc20: erc20Token,
        tokenDecimals: 18,
      });

      console.log('✓ Donation transaction sent');

      // Step 9: Wait for donation transaction confirmation
      console.log('Step 9: Waiting for donation transaction confirmation...');
      const {hash: donationHash} = await donationTxResponse.wait();
      console.log(
        `✓ Donation transaction confirmed with hash: ${donationHash}`,
      );

      // Step 10: Create blockchain adapter and perform split operation to make funds collectable
      console.log('Step 10: Performing split operation...');
      const adapter = resolveBlockchainAdapter(walletClient);
      const accountId = await calcAddressId(adapter, account.address);
      console.log(`✓ Account ID calculated: ${accountId}`);

      const dripsContractAddress =
        contractsRegistry[localtestnet.id as SupportedChain].drips.address;

      const splitTx = buildTx({
        abi: dripsAbi,
        contract: dripsContractAddress,
        functionName: 'split',
        args: [accountId, erc20Token, []],
      });

      const writeAdapter = adapter as WriteBlockchainAdapter;
      const splitTxResponse = await writeAdapter.sendTx(splitTx);
      console.log(`✓ Split transaction sent: ${splitTxResponse.hash}`);

      // Wait for transaction confirmation
      await splitTxResponse.wait();
      console.log('✓ Split transaction confirmed');

      // Step 11: Await for indexing by polling until collectable amount increases
      console.log(
        'Step 11: Awaiting indexing by polling collectable amount...',
      );
      const expectedCollectableAmount =
        initialCollectableAmount + donationAmount;

      const result = await expectUntil(
        async () => {
          const currentWithdrawableBalances =
            await sdk.funds.getWithdrawableBalances(localtestnet.id);

          let currentCollectableAmount = BigInt(0);
          currentWithdrawableBalances.forEach(chainData => {
            chainData.withdrawableBalances.forEach(balance => {
              if (
                balance.tokenAddress.toLowerCase() === erc20Token.toLowerCase()
              ) {
                currentCollectableAmount = BigInt(balance.collectableAmount);
              }
            });
          });

          return currentCollectableAmount;
        },
        currentAmount => currentAmount >= expectedCollectableAmount,
        INDEXING_TIMEOUT,
        POLLING_INTERVAL,
        true,
      );

      if (result.failed) {
        throw new Error(
          `Indexing failed: Expected collectable amount ${expectedCollectableAmount}, but indexing timed out`,
        );
      }

      console.log(
        `✓ Indexing successful! Collectable amount increased from ${initialCollectableAmount} to ${result.result}`,
      );

      // Step 12: Get initial wallet balance before collection
      console.log('Step 12: Getting initial wallet balance...');
      const initialWalletBalance = await publicClient.readContract({
        address: erc20Token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account.address],
      });
      console.log(`✓ Initial wallet balance: ${initialWalletBalance}`);

      // Step 13: Collect the collectable amount
      console.log('Step 13: Collecting collectable amount...');
      const collectTxResponse = await sdk.funds.collect({
        accountId,
        currentReceivers: [],
        tokenAddresses: [erc20Token],
      });

      console.log('✓ Collection transaction sent');

      // Wait for collection transaction confirmation
      const {hash: collectHash} = await collectTxResponse.wait();
      console.log(
        `✓ Collection transaction confirmed with hash: ${collectHash}`,
      );

      // Step 14: Verify collectable amount decreased
      console.log('Step 14: Verifying collectable amount decreased...');
      const collectResult = await expectUntil(
        async () => {
          const currentWithdrawableBalances =
            await sdk.funds.getWithdrawableBalances(localtestnet.id);

          let currentCollectableAmount = BigInt(0);
          currentWithdrawableBalances.forEach(chainData => {
            chainData.withdrawableBalances.forEach(balance => {
              if (
                balance.tokenAddress.toLowerCase() === erc20Token.toLowerCase()
              ) {
                currentCollectableAmount = BigInt(balance.collectableAmount);
              }
            });
          });

          return currentCollectableAmount;
        },
        currentAmount => currentAmount === BigInt(0),
        INDEXING_TIMEOUT,
        POLLING_INTERVAL,
        true,
      );

      if (collectResult.failed) {
        throw new Error(
          'Collection verification failed: Expected collectable amount to be 0, but indexing timed out',
        );
      }

      console.log(
        `✓ Collection verified! Collectable amount decreased back to ${collectResult.result}`,
      );

      // Step 15: Verify wallet balance increased
      console.log('Step 15: Verifying wallet balance increased...');
      const finalWalletBalance = await publicClient.readContract({
        address: erc20Token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account.address],
      });

      const expectedWalletBalance =
        BigInt(initialWalletBalance) +
        parseUnits(donationAmount.toString(), 18);

      expect(BigInt(finalWalletBalance)).toBe(expectedWalletBalance);

      console.log(
        `✓ Wallet balance increased from ${initialWalletBalance} to ${finalWalletBalance} (expected: ${expectedWalletBalance})`,
      );

      console.log(
        '✓ Donation, split, indexing, and collection flow verified successfully with Viem!',
      );
    });

    it('should collect using Ethers', {timeout: TEST_TIMEOUT}, async () => {
      console.log('=== Donation, Split, and Indexing Flow with Ethers ===');

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

      // Step 5: Query collectable balances before donation
      console.log('Step 5: Querying collectable balances before donation...');
      const walletAddress = await wallet.getAddress();
      const initialWithdrawableBalances =
        await sdk.funds.getWithdrawableBalances(localtestnet.id);
      console.log('✓ Initial withdrawable balances retrieved');

      const erc20Token = process.env.TEST_ERC20_ADDRESS! as Address;
      let initialCollectableAmount = BigInt(0);

      initialWithdrawableBalances.forEach(chainData => {
        chainData.withdrawableBalances.forEach(balance => {
          if (balance.tokenAddress.toLowerCase() === erc20Token.toLowerCase()) {
            initialCollectableAmount = BigInt(balance.collectableAmount);
            console.log(
              `  Initial collectable amount for ${balance.tokenAddress}: ${balance.collectableAmount}`,
            );
          }
        });
      });

      // Step 6: Define the donation parameters
      console.log('Step 6: Defining donation parameters...');
      const oneTimeDonationReceiver: SdkReceiver = {
        type: 'address',
        address: walletAddress as Address,
      };

      const donationAmount = 1n; // 1 token

      // Step 7: Approve token spending
      console.log('Step 7: Approving token spending...');
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
        parseUnits(donationAmount.toString(), 18),
      );

      console.log(
        `✓ Token approval transaction sent with hash: ${approveTx.hash}`,
      );
      await approveTx.wait();
      console.log('✓ Token approval confirmed');

      // Step 8: Send the one-time donation
      console.log('Step 8: Sending one-time donation to address...');
      const donationTxResponse = await sdk.donations.sendOneTime({
        receiver: oneTimeDonationReceiver,
        amount: donationAmount,
        erc20: erc20Token,
        tokenDecimals: 18,
      });

      console.log('✓ Donation transaction sent');

      // Step 9: Wait for donation transaction confirmation
      console.log('Step 9: Waiting for donation transaction confirmation...');
      const {hash: donationHash} = await donationTxResponse.wait();
      console.log(
        `✓ Donation transaction confirmed with hash: ${donationHash}`,
      );

      // Step 10: Create blockchain adapter and perform split operation to make funds collectable
      console.log('Step 10: Performing split operation...');
      const adapter = resolveBlockchainAdapter(wallet);
      const accountId = await calcAddressId(adapter, walletAddress as Address);
      console.log(`✓ Account ID calculated: ${accountId}`);

      const dripsContractAddress =
        contractsRegistry[localtestnet.id as SupportedChain].drips.address;

      const splitTx = buildTx({
        abi: dripsAbi,
        contract: dripsContractAddress,
        functionName: 'split',
        args: [accountId, erc20Token, []],
      });

      const writeAdapter = adapter as WriteBlockchainAdapter;
      const splitTxResponse = await writeAdapter.sendTx(splitTx);
      console.log(`✓ Split transaction sent: ${splitTxResponse.hash}`);

      // Wait for transaction confirmation
      await splitTxResponse.wait();
      console.log('✓ Split transaction confirmed');

      // Step 11: Await for indexing by polling until collectable amount increases
      console.log(
        'Step 11: Awaiting indexing by polling collectable amount...',
      );
      const expectedCollectableAmount =
        initialCollectableAmount + donationAmount;

      const result = await expectUntil(
        async () => {
          const currentWithdrawableBalances =
            await sdk.funds.getWithdrawableBalances(localtestnet.id);

          let currentCollectableAmount = BigInt(0);
          currentWithdrawableBalances.forEach(chainData => {
            chainData.withdrawableBalances.forEach(balance => {
              if (
                balance.tokenAddress.toLowerCase() === erc20Token.toLowerCase()
              ) {
                currentCollectableAmount = BigInt(balance.collectableAmount);
              }
            });
          });

          return currentCollectableAmount;
        },
        currentAmount => currentAmount >= expectedCollectableAmount,
        INDEXING_TIMEOUT,
        POLLING_INTERVAL,
        true,
      );

      if (result.failed) {
        throw new Error(
          `Indexing failed: Expected collectable amount ${expectedCollectableAmount}, but indexing timed out`,
        );
      }

      console.log(
        `✓ Indexing successful! Collectable amount increased from ${initialCollectableAmount} to ${result.result}`,
      );

      // Step 12: Get initial wallet balance before collection
      console.log('Step 12: Getting initial wallet balance...');
      const erc20ContractForBalance = new Contract(
        erc20Token,
        [
          {
            inputs: [{name: 'account', type: 'address'}],
            name: 'balanceOf',
            outputs: [{name: '', type: 'uint256'}],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        wallet,
      );

      const initialWalletBalance =
        await erc20ContractForBalance.balanceOf(walletAddress);
      console.log(`✓ Initial wallet balance: ${initialWalletBalance}`);

      // Step 13: Collect the collectable amount
      console.log('Step 13: Collecting collectable amount...');
      const collectTxResponse = await sdk.funds.collect({
        accountId,
        currentReceivers: [],
        tokenAddresses: [erc20Token],
      });

      console.log('✓ Collection transaction sent');

      // Wait for collection transaction confirmation
      const {hash: collectHash} = await collectTxResponse.wait();
      console.log(
        `✓ Collection transaction confirmed with hash: ${collectHash}`,
      );

      // Step 14: Verify collectable amount decreased
      console.log('Step 14: Verifying collectable amount decreased...');
      const collectResult = await expectUntil(
        async () => {
          const currentWithdrawableBalances =
            await sdk.funds.getWithdrawableBalances(localtestnet.id);

          let currentCollectableAmount = BigInt(0);
          currentWithdrawableBalances.forEach(chainData => {
            chainData.withdrawableBalances.forEach(balance => {
              if (
                balance.tokenAddress.toLowerCase() === erc20Token.toLowerCase()
              ) {
                currentCollectableAmount = BigInt(balance.collectableAmount);
              }
            });
          });

          return currentCollectableAmount;
        },
        currentAmount => currentAmount === BigInt(0),
        INDEXING_TIMEOUT,
        POLLING_INTERVAL,
        true,
      );

      if (collectResult.failed) {
        throw new Error(
          'Collection verification failed: Expected collectable amount to be 0, but indexing timed out',
        );
      }

      console.log(
        `✓ Collection verified! Collectable amount decreased back to ${collectResult.result}`,
      );

      // Step 15: Verify wallet balance increased
      console.log('Step 15: Verifying wallet balance increased...');
      const finalWalletBalance =
        await erc20ContractForBalance.balanceOf(walletAddress);

      const expectedWalletBalance =
        BigInt(initialWalletBalance) +
        parseUnits(donationAmount.toString(), 18);
      expect(BigInt(finalWalletBalance)).toBe(expectedWalletBalance);

      console.log(
        `✓ Wallet balance increased from ${initialWalletBalance} to ${finalWalletBalance} (expected: ${expectedWalletBalance})`,
      );

      console.log(
        '✓ Donation, split, indexing, and collection flow verified successfully with Ethers!',
      );
    });
  });
});
