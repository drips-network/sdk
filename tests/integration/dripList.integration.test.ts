import {describe, it, expect} from 'vitest';
import {createDripsSdk} from '../../src/sdk/createDripsSdk';
import {createWalletClient, http} from 'viem';
import {JsonRpcProvider, Wallet} from 'ethers';
import {createPinataIpfsUploader} from '../../src/internal/metadata/createPinataIpfsUploader';
import dotenv from 'dotenv';
import {expect as expectUntil} from '../../src/internal/shared/expect';
import {graphqlChainMap} from '../../src/internal/config/graphqlChainMap';
import {privateKeyToAccount} from 'viem/accounts';
import {
  AddressSplitsReceiver,
  DripListSplitsReceiver,
  ProjectSplitsReceiver,
  SdkSplitsReceiver,
} from '../../src/internal/shared/mapToOnChainReceiver';

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
  it(
    'should create a Drip List using Viem',
    {timeout: 60_000},

    async () => {
      console.log('=== Creating Drip List with Viem ===');

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

      // Step 5: Define the split receivers (who gets the funds)
      console.log('Step 5: Defining split receivers...');
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'project',
          url: 'https://github.com/drips-network/sdk',
          weight: 50,
        } as ProjectSplitsReceiver, // 50% weight
        {
          type: 'drip-list',
          accountId:
            52616587671615462427509444020197501845441172922057966140772529247192n,
          weight: 25,
        } as DripListSplitsReceiver, // 25% weight
        {
          type: 'address',
          address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
          weight: 25,
        } as AddressSplitsReceiver, // 25% weight
      ];

      // Step 6: Create the drip list
      console.log('Step 6: Creating drip list...');
      const {dripListId, salt, ipfsHash, txResponse} =
        await sdk.dripLists.create({
          name: 'Test Drip List (Viem)',
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
          dripList.name === 'Test Drip List (Viem)' &&
          dripList.description ===
            'A test drip list created using Viem adapter',
        60_000,
        2_000,
        true,
      );

      if (result.failed) {
        throw new Error('Drip list was not indexed within the timeout');
      }

      const dripList = result.result;

      // Step 9: Verify all fields
      console.log('Step 9: Verifying drip list fields...');
      expect(dripList).not.toBeNull();
      expect(dripList?.name).toBe('Test Drip List (Viem)');
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

      console.log('✓ All drip list fields verified successfully!');
    },
  );

  it('should create a Drip List using Ethers', {timeout: 60_000}, async () => {
    console.log('=== Creating Drip List with Ethers ===');

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

    // Step 5: Define the split receivers (who gets the funds)
    console.log('Step 5: Defining split receivers...');
    const receivers: SdkSplitsReceiver[] = [
      {
        type: 'project',
        url: 'https://github.com/drips-network/sdk',
        weight: 50,
      } as ProjectSplitsReceiver, // 50% weight
      {
        type: 'drip-list',
        accountId:
          52616587671615462427509444020197501845441172922057966140772529247192n,
        weight: 25,
      } as DripListSplitsReceiver, // 25% weight
      {
        type: 'address',
        address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
        weight: 25,
      } as AddressSplitsReceiver, // 25% weight
    ];

    // Step 6: Create the drip list
    console.log('Step 6: Creating drip list...');
    const {dripListId, salt, ipfsHash, txResponse} = await sdk.dripLists.create(
      {
        name: 'Test Drip List (Ethers)',
        description: 'A test drip list created using Ethers adapter',
        isVisible: true,
        receivers,
      },
    );

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
        dripList.name === 'Test Drip List (Ethers)' &&
        dripList.description ===
          'A test drip list created using Ethers adapter',
      60_000,
      2_000,
      true,
    );

    if (result.failed) {
      throw new Error('Drip list was not indexed within the timeout');
    }

    const dripList = result.result;

    // Step 9: Verify all fields
    console.log('Step 9: Verifying drip list fields...');
    expect(dripList).not.toBeNull();
    expect(dripList?.name).toBe('Test Drip List (Ethers)');
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

    console.log('✓ All drip list fields verified successfully!');
  });
});
