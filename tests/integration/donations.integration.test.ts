import {describe, it, expect} from 'vitest';
import {createDripsSdk} from '../../src/sdk/createDripsSdk';
import {createWalletClient, http} from 'viem';
import {JsonRpcProvider, Wallet, Contract} from 'ethers';
import {createPinataIpfsUploader} from '../../src/internal/metadata/createPinataIpfsUploader';
import * as dotenv from 'dotenv';
import {expect as expectUntil} from '../../src/internal/shared/expect';
import {privateKeyToAccount} from 'viem/accounts';
import {OneTimeDonationReceiver} from '../../src/internal/donations/prepareOneTimeDonationTx';
import {
  AddressSplitsReceiver,
  SdkSplitsReceiver,
} from '../../src/internal/shared/mapToOnChainReceiver';
import {contractsRegistry} from '../../src/internal/config/contractsRegistry';

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
  it(
    'should send a one-time donation using Viem',
    {timeout: 120_000},

    async () => {
      console.log('=== Sending One-Time Donation with Viem ===');

      // Step 1: Set up your wallet account from private key
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
      const ipfsUploader = createPinataIpfsUploader({
        pinataJwt: process.env.PINATA_JWT!,
        pinataGateway: process.env.PINATA_GATEWAY!,
      });

      // Step 4: Create the Drips SDK instance
      console.log('Step 4: Creating Drips SDK...');
      const sdk = createDripsSdk(walletClient, ipfsUploader, {
        graphqlUrl: process.env.GRAPHQL_URL!,
      });

      // Step 5: Create a drip list to receive donations
      console.log('Step 5: Creating a drip list to receive donations...');
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'address',
          address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
          weight: 100,
        } as AddressSplitsReceiver,
      ];

      const {dripListId, txResponse: createTxResponse} =
        await sdk.dripLists.create({
          name: 'Test Donation Receiver (Viem)',
          description: 'A drip list to test donations',
          isVisible: true,
          receivers,
        });

      console.log(`✓ Drip list created with ID: ${dripListId}`);

      // Step 6: Wait for drip list creation confirmation
      console.log('Step 6: Waiting for drip list creation confirmation...');
      await createTxResponse.wait();
      console.log('✓ Drip list creation confirmed');

      // Step 7: Define the donation parameters
      console.log('Step 7: Defining donation parameters...');
      const receiver: OneTimeDonationReceiver = {
        type: 'drip-list',
        accountId: dripListId,
        amount: BigInt(1000000), // 1 USDC (6 decimals)
      };

      const donationAmount = BigInt(1000000); // 1 USDC (6 decimals)
      const erc20Token = process.env.TEST_ERC20_ADDRESS! as `0x${string}`;

      // Step 8: Approve token spending for the address driver contract
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
        receiver,
        amount: donationAmount,
        erc20: erc20Token,
      });

      console.log('✓ Donation transaction sent');

      // Step 10: Wait for donation transaction confirmation
      console.log('Step 10: Waiting for donation transaction confirmation...');
      const {hash} = await donationTxResponse.wait();
      console.log(`✓ Donation transaction confirmed with hash: ${hash}`);

      // Step 11: Wait for indexing and verify the donation appears in drip list support
      console.log(
        'Step 11: Waiting for indexing and verifying donation support...',
      );

      const result = await expectUntil(
        () => sdk.dripLists.getById(dripListId, localtestnet.id),
        dripList => {
          if (!dripList || !dripList.support || dripList.support.length === 0) {
            return false;
          }

          const donation = dripList.support.find(
            (support: any) =>
              support.__typename === 'OneTimeDonationSupport' &&
              support.account?.address?.toLowerCase() ===
                account.address.toLowerCase() &&
              support.amount?.tokenAddress?.toLowerCase() ===
                erc20Token.toLowerCase() &&
              support.amount?.amount === donationAmount.toString(),
          );

          return donation !== undefined;
        },
        120_000,
        2_000,
        true,
      );

      if (result.failed) {
        throw new Error(
          'Donation was not indexed in drip list support within the timeout',
        );
      }

      const dripList = (result as any).result;

      // Step 12: Verify donation support data
      console.log('Step 12: Verifying donation support data...');
      expect(dripList).not.toBeNull();
      expect(dripList?.support).toBeDefined();
      expect(dripList?.support.length).toBeGreaterThan(0);

      const donation = dripList?.support.find(
        (support: any) =>
          support.__typename === 'OneTimeDonationSupport' &&
          support.account?.address?.toLowerCase() ===
            account.address.toLowerCase() &&
          support.amount?.tokenAddress?.toLowerCase() ===
            erc20Token.toLowerCase(),
      ) as any;

      expect(donation).toBeDefined();
      expect(donation?.account?.address?.toLowerCase()).toBe(
        account.address.toLowerCase(),
      );
      expect(donation?.amount?.amount).toBe(donationAmount.toString());
      expect(donation?.amount?.tokenAddress?.toLowerCase()).toBe(
        erc20Token.toLowerCase(),
      );

      console.log(
        '✓ One-time donation sent and verified successfully with Viem!',
      );
    },
  );

  it(
    'should send a one-time donation using Ethers',
    {timeout: 120_000},
    async () => {
      try {
        console.log('=== Sending One-Time Donation with Ethers ===');

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
          graphqlUrl: process.env.GRAPHQL_URL!,
        });

        // Step 5: Create a drip list to receive donations
        console.log('Step 5: Creating a drip list to receive donations...');
        const receivers: SdkSplitsReceiver[] = [
          {
            type: 'address',
            address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
            weight: 100,
          } as AddressSplitsReceiver,
        ];

        const {dripListId, txResponse: createTxResponse} =
          await sdk.dripLists.create({
            name: 'Test Donation Receiver (Ethers)',
            description: 'A drip list to test donations',
            isVisible: true,
            receivers,
          });

        console.log(`✓ Drip list created with ID: ${dripListId}`);

        // Step 6: Wait for drip list creation confirmation
        console.log('Step 6: Waiting for drip list creation confirmation...');
        await createTxResponse.wait();
        console.log('✓ Drip list creation confirmed');

        await wallet.provider?.waitForTransaction(createTxResponse.hash);

        // Step 7: Define the donation parameters
        console.log('Step 7: Defining donation parameters...');
        const receiver: OneTimeDonationReceiver = {
          type: 'drip-list',
          accountId: dripListId,
          amount: BigInt(1000000), // 1 USDC (6 decimals)
        };

        const donationAmount = BigInt(1000000); // 1 USDC (6 decimals)
        const erc20Token = process.env.TEST_ERC20_ADDRESS! as `0x${string}`;

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
          receiver,
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
              (support: any) =>
                support.__typename === 'OneTimeDonationSupport' &&
                support.account?.address?.toLowerCase() ===
                  wallet.address.toLowerCase() &&
                support.amount?.tokenAddress?.toLowerCase() ===
                  erc20Token.toLowerCase() &&
                support.amount?.amount === donationAmount.toString(),
            );

            return donation !== undefined;
          },
          120_000,
          2_000,
          true,
        );

        if (result.failed) {
          throw new Error(
            'Donation was not indexed in drip list support within the timeout',
          );
        }

        const dripList = (result as any).result;

        // Step 12: Verify donation support data
        console.log('Step 12: Verifying donation support data...');
        expect(dripList).not.toBeNull();
        expect(dripList?.support).toBeDefined();
        expect(dripList?.support.length).toBeGreaterThan(0);

        const donation = dripList?.support.find(
          (support: any) =>
            support.__typename === 'OneTimeDonationSupport' &&
            support.account?.address?.toLowerCase() ===
              wallet.address.toLowerCase() &&
            support.amount?.tokenAddress?.toLowerCase() ===
              erc20Token.toLowerCase(),
        ) as any;

        expect(donation).toBeDefined();
        expect(donation?.account?.address?.toLowerCase()).toBe(
          wallet.address.toLowerCase(),
        );
        expect(donation?.amount?.amount).toBe(donationAmount.toString());
        expect(donation?.amount?.tokenAddress?.toLowerCase()).toBe(
          erc20Token.toLowerCase(),
        );

        console.log(
          '✓ One-time donation sent and verified successfully with Ethers!',
        );
      } catch (error) {
        console.log('💧💧💧💧💧💧 ~ error:', error);
      }
    },
  );
});
