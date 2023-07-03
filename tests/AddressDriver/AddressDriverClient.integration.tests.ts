import { InfuraProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { assert } from 'chai';
import AddressDriverClient from '../../src/AddressDriver/AddressDriverClient';
import DripsClient from '../../src/Drips/DripsClient';
import Utils from '../../src/utils';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import { expect } from '../../src/common/internals';
import type { SplitsEntry, UserAssetConfig, UserMetadataEntry } from '../../src/DripsSubgraph/types';
import type { CollectableBalance } from '../../src/Drips/types';
import constants from '../../src/constants';

dotenv.config();

describe('AddressDriver integration tests', () => {
	const THREE_MINS = 180000; // In milliseconds.
	const WETH = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';
	const provider = new InfuraProvider('sepolia');
	const account1 = process.env.ACCOUNT_1 as string;
	const account2 = process.env.ACCOUNT_2 as string;
	const account1AsSigner = new Wallet(process.env.ACCOUNT_1_SECRET_KEY as string);
	const account2AsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

	let dripsHubClient: DripsClient;
	let subgraphClient: DripsSubgraphClient;
	let account1AddressDriverClient: AddressDriverClient;
	let account2AddressDriverClient: AddressDriverClient;

	beforeEach(async () => {
		dripsHubClient = await DripsClient.create(provider, account1AsSigner);
		subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);
		account1AddressDriverClient = await AddressDriverClient.create(provider, account1AsSigner);
		account2AddressDriverClient = await AddressDriverClient.create(provider, account2AsSigner);
	});

	it('should set Drips configuration', async () => {
		console.log(`Will update WETH (${WETH}) Drips configuration for ${account2}.`);

		const userId1 = await account1AddressDriverClient.getUserId();
		const userId2 = await account2AddressDriverClient.getUserId();

		const wEthConfigurationBefore = await subgraphClient.getUserAssetConfigById(
			userId2,
			Utils.Asset.getIdFromAddress(WETH)
		);
		console.log(
			`Current WETH Drips configuration has the following receivers: ${
				wEthConfigurationBefore?.dripsEntries.length
					? wEthConfigurationBefore?.dripsEntries.map((d) => `id: ${d.id}, userId: ${d.userId}, config: ${d.config}`)
					: '[no receivers or no configuration found]'
			}`
		);

		const config = Utils.DripsReceiverConfiguration.toUint256({
			start: BigInt(1),
			duration: BigInt(2),
			amountPerSec: BigInt(3 * constants.AMT_PER_SEC_MULTIPLIER),
			dripId: BigInt(Math.floor(Math.random() * 1_000_000_000))
		});

		console.log(`Updating Drips configuration...`);
		await account2AddressDriverClient.setStreams(
			WETH,
			await subgraphClient.getCurrentDripsReceivers(userId2, WETH, provider),
			[{ config, userId: userId1 }],
			account2
		);

		console.log(`Querying the Subgraph until the new WETH Drips configuration is the expected...`);
		const expectedConfig = (await expect(
			() => subgraphClient.getUserAssetConfigById(userId2, Utils.Asset.getIdFromAddress(WETH)),
			(configuration) => {
				const found =
					configuration?.dripsEntries.length === 1 &&
					configuration.dripsEntries[0].config === config &&
					configuration.dripsEntries[0].userId === userId1;

				if (!found) {
					console.log('New Drips configuration not found yet.');
				} else {
					console.log('New Drips configuration found!');
				}

				return found;
			},
			60000,
			5000
		)) as UserAssetConfig;

		assert.equal(expectedConfig.dripsEntries[0].userId, userId1);

		console.log(`Clearing WETH configuration receivers to stop dripping...`);
		await account2AddressDriverClient.setStreams(
			WETH,
			await subgraphClient.getCurrentDripsReceivers(userId2, WETH, provider),
			[],
			account2
		);
		console.log(`Done.`);
	}).timeout(THREE_MINS);

	it('should set Splits configuration', async () => {
		console.log(`Will update Splits configuration for ${account2}.`);

		const userId1 = await account1AddressDriverClient.getUserId();
		const userId2 = await account2AddressDriverClient.getUserId();

		const splitsConfigurationBefore = await subgraphClient.getSplitsConfigByUserId(userId2);
		console.log(
			`Current Splits configuration has the following receivers: ${
				splitsConfigurationBefore?.length
					? splitsConfigurationBefore.map(
							(d) => `id: ${d.id}, userId: ${d.userId}, senderId: ${d.senderId}, weight: ${d.weight}`
					  )
					: '[no receivers or no configuration found]'
			}`
		);

		console.log(`Updating Splits configuration...`);
		await account2AddressDriverClient.setSplits([
			{
				userId: userId1,
				weight: 1
			}
		]);

		console.log(`Querying the Subgraph until the new Splits configuration is the expected...`);
		const expectedConfig = (await expect(
			() => subgraphClient.getSplitsConfigByUserId(userId2),
			(configuration) => {
				const found =
					configuration?.length === 1 && configuration[0].weight === 1n && configuration[0].userId === userId1;

				if (!found) {
					console.log('New Splits configuration not found yet.');
				} else {
					console.log('New Splits configuration found!');
				}

				return found;
			},
			60000,
			5000
		)) as SplitsEntry[];

		assert.equal(expectedConfig[0].userId, userId1);

		console.log(`Clearing Splits configuration receivers for stop splitting...`);
		await account2AddressDriverClient.setSplits([]);
		console.log(`Done.`);
	}).timeout(THREE_MINS);

	it('should emit user metadata', async () => {
		const userId2 = await account2AddressDriverClient.getUserId();

		console.log(`Will emit user metadata for account '${account2}' (user ID: '${userId2}').`);

		const key = BigInt(Math.floor(Math.random() * 1_000_000_000)).toString();
		const value = `${key}-value`;
		const metadata = Utils.Metadata.createFromStrings(key, value);

		assert.isNull(await subgraphClient.getLatestUserMetadata(userId2, key));

		console.log(
			`Emitting metadata with key: ${key} (${metadata.key}) and value: ${value} (${metadata.value}) for test user ${userId2}`
		);
		await account2AddressDriverClient.emitUserMetadata([
			{
				key,
				value
			}
		]);
		console.log('Emitted.');

		console.log(`Querying the subgraph until the new metadata is found...`);
		const expectedMetadata = (await expect(
			() => subgraphClient.getLatestUserMetadata(userId2, key),
			(latestMetadataEntry) => {
				const found =
					latestMetadataEntry?.key === key &&
					latestMetadataEntry.value === value &&
					latestMetadataEntry.userId === userId2 &&
					latestMetadataEntry.id === `${userId2}-${key}`;

				if (!found) {
					console.log('Emitted metadata not found yet.');
				} else {
					console.log('Emitted metadata found!');
				}

				return found;
			},
			60000,
			5000
		)) as UserMetadataEntry;

		assert.equal(expectedMetadata.id, `${userId2}-${key}`);
	}).timeout(THREE_MINS);

	it('should give to another address', async () => {
		const giveClient = account1AddressDriverClient;
		const giver = await giveClient.signer!.getAddress();
		const giverUserId = await giveClient.getUserId();
		const receiverClient = account2AddressDriverClient;
		const receiverUserId = await receiverClient.getUserId();
		const receiver = await receiverClient.signer!.getAddress();

		assert.equal(giver, account1);
		assert.equal(receiver, account2);

		console.log(
			`Will give WETH (${WETH}) from ${giver} (userId: ${giverUserId}) to ${receiver} (user ID: ${receiverUserId}).`
		);

		await giveClient.approve(WETH);

		console.log('Setting splits to empty array for the receiver...');
		await receiverClient.setSplits([]);

		console.log("Querying the Subgraph until receiver's Splits are cleared...");
		(await expect(
			() => subgraphClient.getSplitsConfigByUserId(receiverUserId),
			(configuration) => configuration.length === 0,
			60000,
			5000
		)) as SplitsEntry[];

		console.log("Collecting for receiver to reset receiver's collectable amount to 0...");
		await receiverClient.collect(WETH, receiver);

		console.log("Querying the Subgraph until receiver's collectable amount is 0...");
		(await expect(
			() => dripsHubClient.getCollectableBalanceForUser(receiverUserId, WETH),
			(collectable) => {
				const found = collectable.collectableAmount === 0n;

				if (!found) {
					console.log(`Expected collectable amount to be 0 but was ${collectable.collectableAmount}.`);
				} else {
					console.log(`Expected collectable amount is ${collectable.collectableAmount}!`);
				}

				return found;
			},
			60000,
			5000
		)) as CollectableBalance;

		console.log(`Giving from ${account1} to ${account2}...`);
		await giveClient.give(receiverUserId, WETH, 1);
		console.log('Successfully gave...');
		console.log('Awaiting for the blockchain to update...');
		await expect(
			() => 1,
			() => false,
			40000,
			30000
		);

		const receiverSplitConfig = await subgraphClient.getSplitsConfigByUserId(receiverUserId);

		console.log('Splitting before collecting...');
		await dripsHubClient.split(
			receiverUserId,
			WETH,
			receiverSplitConfig.map((r) => ({
				userId: r.userId,
				weight: r.weight
			}))
		);

		console.log("Querying the Subgraph until receiver's collectable amount is the expected...");
		const expectedCollectable = (await expect(
			() => dripsHubClient.getCollectableBalanceForUser(receiverUserId, WETH),
			(collectable) => {
				const found = collectable.collectableAmount === 1n;

				if (!found) {
					console.log(`Expected collectable amount to be 1 but was ${collectable.collectableAmount}.`);
				} else {
					console.log(`Expected collectable amount is ${collectable.collectableAmount}!`);
				}

				return found;
			},
			60000,
			5000
		)) as CollectableBalance;

		const collectableAfter = await dripsHubClient.getCollectableBalanceForUser(receiverUserId, WETH);
		console.log(`Collectable amount after receiving is ${collectableAfter.collectableAmount}`);

		assert.equal(expectedCollectable.collectableAmount, 1n);
	}).timeout(THREE_MINS);
});
