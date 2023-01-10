import { InfuraProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import NFTDriverClient from '../../src/NFTDriver/NFTDriverClient';
import Utils from '../../src/utils';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import { assert } from 'chai';
import { createFromStrings, wait } from '../../src/common/internals';

dotenv.config();

describe('NFTDriver integration tests', () => {
	const THREE_MINS = 180000; // In milliseconds.
	const WETH = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

	it.skip('should create a new sub-account and transfer it to the expected address', async () => {
		const provider = new InfuraProvider('goerli');
		const signer = new Wallet(process.env.ACCOUNT_1_SECRET_KEY as string);

		const account1 = process.env.ACCOUNT_1 as string;
		const account2 = process.env.ACCOUNT_2 as string;

		const nftDriverClient = await NFTDriverClient.create(provider, signer);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		// Get all sub-accounts creating a new sub-account.
		console.log(`Getting sub-accounts for ${account1}...`);
		const subAccountsBefore = await subgraphClient.getNftSubAccountsByOwner(account2);
		console.log(`${account1} sub-accounts: ${subAccountsBefore.map((a) => `${a.tokenId}\r\n`)}`);

		// Create a new sub-account and transfer its ownership.
		console.log(`Creating new sub-account and transferring to '${account2}'...`);
		const tokenId = await nftDriverClient.safeCreateAccount(account2, `integration-tests`);
		console.log(`New account token: ${tokenId}`);

		console.log('Awaiting for Subgraph to update...');
		await wait(45);

		// Get all sub-accounts after creating a new sub-account.
		console.log(`Getting sub-accounts after creation for ${account1}...`);
		const subAccountsAfter = await subgraphClient.getNftSubAccountsByOwner(account2);
		console.log(`${account1} sub-accounts: ${subAccountsAfter.map((a) => `${a.tokenId}\r\n`)}`);

		assert.equal(subAccountsAfter.length, subAccountsBefore.length + 1);
		assert.isTrue(subAccountsAfter.some((a) => a.tokenId === tokenId));
		assert.isFalse(subAccountsBefore.some((a) => a.tokenId === tokenId));
	}).timeout(THREE_MINS);

	it.skip('should update Drips configuration', async () => {
		const provider = new InfuraProvider('goerli');
		const signer = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const account2 = process.env.ACCOUNT_2 as string;

		const nftDriverClient = await NFTDriverClient.create(provider, signer);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		console.log(`Getting sub-accounts for ${account2}...`);
		const subAccounts = await subgraphClient.getNftSubAccountsByOwner(account2);
		console.log(`${account2} sub-accounts: ${subAccounts.map((a) => `${a.tokenId}\r\n`)}`);

		if (!subAccounts.length || subAccounts.length < 2) {
			assert.fail('No test sub-accounts found.');
		}

		console.log('Retrieving the first account...');
		const testAccount = subAccounts[0];
		console.log(`Selected test account is ${testAccount.tokenId}.`);

		console.log(`Retrieving WETH configuration for ${testAccount.tokenId}...`);
		const wEthConfigurationBefore = await subgraphClient.getUserAssetConfigById(
			testAccount.tokenId,
			Utils.Asset.getIdFromAddress(WETH)
		);
		console.log('Current WETH configuration receivers:');
		console.log(
			`${wEthConfigurationBefore?.dripsEntries.map((d) => `id: ${d.id}, userId: ${d.userId}, config: ${d.config}`)}`
		);

		const config = Utils.DripsReceiverConfiguration.toUint256({
			start: BigInt(1),
			duration: BigInt(2),
			amountPerSec: BigInt(3),
			dripId: BigInt(Math.floor(Math.random() * 1_000_000_000))
		});

		const receiver = subAccounts[1].tokenId;
		console.log(`Updated configuration will include ${receiver} as the sole receiver.`);

		console.log(`Updating Drips configuration...`);
		await nftDriverClient.setDrips(
			testAccount.tokenId,
			WETH,
			wEthConfigurationBefore?.dripsEntries.map((d) => ({
				config: d.config,
				userId: d.userId
			})) || [],
			[{ config, userId: receiver }],
			account2
		);

		console.log('Awaiting for Subgraph to update...');
		await wait(45);

		console.log('Re-fetching WETH configuration...');
		const wEthConfigurationAfter = await subgraphClient.getUserAssetConfigById(
			testAccount.tokenId,
			Utils.Asset.getIdFromAddress(WETH)
		);
		console.log('Current WETH configuration Drip entries:');
		console.log(
			`${wEthConfigurationAfter?.dripsEntries.map((d) => `id: ${d.id}, userId: ${d.userId}, config: ${d.config}`)}`
		);

		assert.isTrue(wEthConfigurationAfter?.dripsEntries.length === 1);
		assert.isTrue(wEthConfigurationAfter?.dripsEntries[0].userId === receiver);
		assert.isTrue(
			Utils.DripsReceiverConfiguration.fromUint256(wEthConfigurationAfter?.dripsEntries[0].config!).start === BigInt(1)
		);
		assert.isTrue(
			Utils.DripsReceiverConfiguration.fromUint256(wEthConfigurationAfter?.dripsEntries[0].config!).duration ===
				BigInt(2)
		);
		assert.isTrue(
			Utils.DripsReceiverConfiguration.fromUint256(wEthConfigurationAfter?.dripsEntries[0].config!).amountPerSec ===
				BigInt(3)
		);

		console.log(`Clearing WETH configuration receivers...`);
		await nftDriverClient.setDrips(
			testAccount.tokenId,
			WETH,
			wEthConfigurationAfter?.dripsEntries.map((d) => ({
				config: d.config,
				userId: d.userId
			})) || [],
			[],
			account2
		);
		console.log(`Done.`);
	}).timeout(THREE_MINS);

	it.skip('should update Splits configuration', async () => {
		const provider = new InfuraProvider('goerli');
		const signer = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const account2 = process.env.ACCOUNT_2 as string;

		const nftDriverClient = await NFTDriverClient.create(provider, signer);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		console.log(`Getting sub-accounts for ${account2}...`);
		const subAccounts = await subgraphClient.getNftSubAccountsByOwner(account2);
		console.log(`${account2} sub-accounts: ${subAccounts.map((a) => `${a.tokenId}\r\n`)}`);

		if (!subAccounts.length || subAccounts.length < 2) {
			assert.fail('No test sub-accounts found.');
		}

		console.log('Retrieving the first account...');
		const testAccount = subAccounts[0];
		console.log(`Selected test account is ${testAccount.tokenId}.`);

		console.log(`Retrieving Splits configuration for ${testAccount.tokenId}...`);
		const splitsConfigurationBefore = await subgraphClient.getSplitsConfigByUserId(testAccount.tokenId);
		console.log('Current Splits configuration receivers:');
		console.log(
			`${splitsConfigurationBefore.map(
				(d) => `id: ${d.id}, userId: ${d.userId}, senderId: ${d.senderId}, weight: ${d.weight}`
			)}`
		);

		const receiver = subAccounts[1].tokenId;
		console.log(`Updated configuration will include ${receiver} as the sole receiver.`);

		console.log(`Updating Splits configuration...`);
		await nftDriverClient.setSplits(testAccount.tokenId, [
			{
				userId: receiver,
				weight: 1
			}
		]);

		console.log('Awaiting for Subgraph to update...');
		await wait(45);

		console.log('Re-fetching WETH configuration...');
		const splitsConfigurationAfter = await subgraphClient.getSplitsConfigByUserId(testAccount.tokenId);
		console.log('Current WETH configuration Drip entries:');
		console.log(
			`${splitsConfigurationAfter.map(
				(d) => `id: ${d.id}, userId: ${d.userId}, senderId: ${d.senderId}, weight: ${d.weight}`
			)}`
		);

		assert.isTrue(splitsConfigurationAfter.length === 1);
		assert.isTrue(splitsConfigurationAfter[0].userId === receiver);
		assert.isTrue(splitsConfigurationAfter[0].weight === BigInt(1));
		assert.isTrue(splitsConfigurationAfter[0].senderId === testAccount.tokenId);

		console.log(`Clearing Splits configuration receivers...`);
		await nftDriverClient.setSplits(testAccount.tokenId, []);
		console.log(`Done.`);
	}).timeout(THREE_MINS);

	it.skip('should emit user metadata', async () => {
		const provider = new InfuraProvider('goerli');
		const signer = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const account2 = process.env.ACCOUNT_2 as string;

		const nftDriverClient = await NFTDriverClient.create(provider, signer);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		console.log(`Getting sub-accounts for ${account2}...`);
		const subAccounts = await subgraphClient.getNftSubAccountsByOwner(account2);
		console.log(`${account2} sub-accounts: ${subAccounts.map((a) => `${a.tokenId}\r\n`)}`);

		if (!subAccounts.length || subAccounts.length < 2) {
			assert.fail('No test sub-accounts found.');
		}

		console.log('Retrieving the first account...');
		const testAccount = subAccounts[0];
		console.log(`Selected test account is ${testAccount.tokenId}.`);

		const key = BigInt(Math.floor(Math.random() * 1_000_000_000)).toString();
		const value = `${key}-value`;
		const metadata = createFromStrings(key, value);

		assert.isNull(await subgraphClient.getLatestUserMetadata(testAccount.tokenId, key));

		console.log(
			`Emitting metadata with key: ${key} (${metadata.key}) and value: ${value} (${metadata.value}) for test user ${testAccount.tokenId}`
		);
		await nftDriverClient.emitUserMetadata(testAccount.tokenId, [
			{
				key: key,
				value: value
			}
		]);
		console.log('Emitted.');

		console.log('Awaiting for the Subgraph to update...');
		await wait(45);

		console.log('Retrieving latest metadata entry...');
		const latestMetadataEntry = await subgraphClient.getLatestUserMetadata(testAccount.tokenId, key);
		console.log(`Latest metadata key is '${latestMetadataEntry?.key}' and value '${latestMetadataEntry?.value}'`);

		assert.equal(latestMetadataEntry!.key, key);
		assert.equal(latestMetadataEntry!.value, value);
		assert.equal(latestMetadataEntry?.userId, testAccount.tokenId);
		assert.equal(latestMetadataEntry!.id, `${testAccount.tokenId}-${key}`);
	}).timeout(THREE_MINS);
});
