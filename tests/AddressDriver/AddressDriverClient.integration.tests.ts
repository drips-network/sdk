import { InfuraProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import AddressDriverClient from '../../src/AddressDriver/AddressDriverClient';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import Utils from '../../src/utils';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import { assert } from 'chai';
import { createFromStrings, expect } from '../../src/common/internals';
import { SplitsEntry, UserAssetConfig, UserMetadataEntry } from '../../src/DripsSubgraph/types';
import { CollectableBalance } from '../../src/DripsHub/types';

dotenv.config();

describe('AddressDriver integration tests', () => {
	const THREE_MINS = 180000; // In milliseconds.
	const WETH = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

	it('should update WETH Drips configuration', async () => {
		const provider = new InfuraProvider('goerli');
		const account1 = process.env.ACCOUNT_1 as string;
		const account2 = process.env.ACCOUNT_2 as string;

		const account2AsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const account2AddressDriverClient = await AddressDriverClient.create(provider, account2AsSigner);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		const userId2 = await account2AddressDriverClient.getUserIdByAddress(account2);
		console.log(`Will update WETH ('${WETH}') Drips configuration for account '${account2}' (user ID: '${userId2}').`);

		const wEthConfigurationBefore = await subgraphClient.getUserAssetConfigById(
			userId2,
			Utils.Asset.getIdFromAddress(WETH)
		);
		console.log(
			`Drips receivers before updating are: ${wEthConfigurationBefore?.dripsEntries.map(
				(d) => `id: ${d.id}, userId: ${d.userId}, config: ${d.config}`
			)}`
		);

		const config = Utils.DripsReceiverConfiguration.toUint256({
			start: BigInt(1),
			duration: BigInt(2),
			amountPerSec: BigInt(3),
			dripId: BigInt(Math.floor(Math.random() * 1_000_000_000))
		});

		const userId1 = await account2AddressDriverClient.getUserIdByAddress(account1);
		console.log(`New WETH configuration will be dripping to receiver '${account1}' (user ID: '${userId1}').`);

		console.log(`Updating Drips configuration...`);
		await account2AddressDriverClient.setDrips(
			WETH,
			await subgraphClient.getCurrentDripsReceivers(userId2, WETH),
			[{ config, userId: userId1 }],
			account2
		);

		console.log(`Querying the subgraph until it's updated...`);
		const expectedConfig = (await expect(
			() => subgraphClient.getUserAssetConfigById(userId2, Utils.Asset.getIdFromAddress(WETH)),
			(configuration) => {
				const found =
					configuration?.dripsEntries.length === 1 &&
					configuration.dripsEntries[0].config === config &&
					configuration.dripsEntries[0].userId === userId1;

				if (!found) {
					console.log(
						`Retrieved configuration receivers \r\n${configuration?.dripsEntries.map(
							(d) => `id: ${d.id}, userId: ${d.userId}, config: ${d.config}`
						)}
						\r\n do not match the expected receiver.`
					);
				} else {
					console.log('Test condition met!');
				}

				return found;
			},
			60000,
			5000
		)) as UserAssetConfig;

		assert.equal(expectedConfig.dripsEntries[0].userId, userId1);

		console.log(`Clearing WETH configuration receivers...`);
		await account2AddressDriverClient.setDrips(
			WETH,
			await subgraphClient.getCurrentDripsReceivers(userId2, WETH),
			[],
			account2
		);
		console.log(`Done.`);
	}).timeout(THREE_MINS);

	it('should update Splits configuration', async () => {
		const provider = new InfuraProvider('goerli');
		const account1 = process.env.ACCOUNT_1 as string;
		const account2 = process.env.ACCOUNT_2 as string;

		const account2AsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const account2AddressDriverClient = await AddressDriverClient.create(provider, account2AsSigner);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		const userId2 = await account2AddressDriverClient.getUserIdByAddress(account2);
		console.log(`Will update Splits configuration for account '${account2}' (user ID: '${userId2}').`);

		const splitsConfigurationBefore = await subgraphClient.getSplitsConfigByUserId(userId2);
		console.log(
			`Current Splits configuration receivers: ${splitsConfigurationBefore.map(
				(d) => `id: ${d.id}, userId: ${d.userId}, senderId: ${d.senderId}, weight: ${d.weight}`
			)}`
		);

		const userId1 = await account2AddressDriverClient.getUserIdByAddress(account1);
		console.log(`New Splits configuration will be splitting to receiver '${account1}' (user ID: '${userId1}').`);

		console.log(`Updating Splits configuration...`);
		await account2AddressDriverClient.setSplits([
			{
				userId: userId1,
				weight: 1
			}
		]);

		console.log(`Querying the subgraph until it's updated...`);
		const expectedConfig = (await expect(
			() => subgraphClient.getSplitsConfigByUserId(userId2),
			(configuration) => {
				const found =
					configuration?.length === 1 && configuration[0].weight === 1n && configuration[0].userId === userId1;

				if (!found) {
					console.log(
						`Retrieved configuration receivers \r\n${configuration?.map(
							(d) => `id: ${d.id}, userId: ${d.userId}, weight: ${d.weight}`
						)}
						\r\n do not match the expected receiver.`
					);
				} else {
					console.log('Test condition met!');
				}

				return found;
			},
			60000,
			5000
		)) as SplitsEntry[];

		assert.equal(expectedConfig[0].userId, userId1);

		console.log(`Clearing Splits configuration receivers...`);
		await account2AddressDriverClient.setSplits([]);
		console.log(`Done.`);
	}).timeout(THREE_MINS);

	it('should emit user metadata', async () => {
		const provider = new InfuraProvider('goerli');
		const account2 = process.env.ACCOUNT_2 as string;

		const account2AsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const account2AddressDriverClient = await AddressDriverClient.create(provider, account2AsSigner);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		const userId2 = await account2AddressDriverClient.getUserIdByAddress(account2);
		console.log(`Will emit user metadata for account '${account2}' (user ID: '${userId2}').`);

		const key = BigInt(Math.floor(Math.random() * 1_000_000_000)).toString();
		const value = `${key}-value`;
		const metadata = createFromStrings(key, value);

		assert.isNull(await subgraphClient.getLatestUserMetadata(userId2, key));

		console.log(
			`Emitting metadata with key: ${key} (${metadata.key}) and value: ${value} (${metadata.value}) for test user ${userId2}`
		);
		await account2AddressDriverClient.emitUserMetadata([
			{
				key: key,
				value: value
			}
		]);
		console.log('Emitted.');

		console.log(`Querying the subgraph until it's updated...`);
		const expectedMetadata = (await expect(
			() => subgraphClient.getLatestUserMetadata(userId2, key),
			(latestMetadataEntry) => {
				const found =
					latestMetadataEntry?.key === key &&
					latestMetadataEntry.value === value &&
					latestMetadataEntry.userId === userId2 &&
					latestMetadataEntry.id === `${userId2}-${key}`;

				if (!found) {
					console.log(
						`Retrieved 'latestMetadataEntry' (id: ${latestMetadataEntry?.id}, key: ${latestMetadataEntry?.key}, value: ${latestMetadataEntry?.value}, userId: ${latestMetadataEntry?.userId}, lastUpdatedBlockTimestamp: ${latestMetadataEntry?.lastUpdatedBlockTimestamp}) does not match the expected.`
					);
				} else {
					console.log('Test condition met!');
				}

				return found;
			},
			60000,
			5000
		)) as UserMetadataEntry;

		assert.equal(expectedMetadata.id, `${userId2}-${key}`);
	}).timeout(THREE_MINS);

	it('should give to another address', async () => {
		const provider = new InfuraProvider('goerli');

		const giveAccount = process.env.ACCOUNT_1 as string;
		const receiver = process.env.ACCOUNT_2 as string;

		const account1AsSigner = new Wallet(process.env.ACCOUNT_1_SECRET_KEY as string);
		const account2AsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const giveClient = await AddressDriverClient.create(provider, account1AsSigner);
		const giveAccountUserId = await giveClient.getUserId();

		const receiverClient = await AddressDriverClient.create(provider, account2AsSigner);
		const receiverUserId = await receiverClient.getUserId();

		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		console.log(
			`Will give from WETH ('${WETH}') ${giveAccount}' (user ID: '${giveAccountUserId}') to '${receiver}' (user ID: '${receiverUserId}').`
		);

		await giveClient.approve(WETH);

		console.log('Setting splits to empty array for the receiver...');
		await receiverClient.setSplits([]);

		console.log('Awaiting for the blockchain to update...');
		(await expect(
			() => subgraphClient.getSplitsConfigByUserId(receiverUserId),
			(configuration) => {
				return configuration.length === 0;
			},
			60000,
			5000
		)) as SplitsEntry[];

		console.log("Collecting for receiver to reset receiver's collectable amount to 0...");
		await receiverClient.collect(WETH, receiver);

		const dripsHub = await DripsHubClient.create(provider, account1AsSigner);

		console.log('Awaiting for the blockchain to update...');
		(await expect(
			() => dripsHub.getCollectableBalanceForUser(receiverUserId, WETH),
			(collectable) => {
				const found = collectable.collectableAmount === 0n;

				if (!found) {
					console.log(`Expected collectable amount to be 0 but was ${collectable.collectableAmount}.`);
				} else {
					console.log('Found.');
				}

				return found;
			},
			60000,
			5000
		)) as CollectableBalance;

		console.log(`Giving...`);
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
		await dripsHub.split(
			receiverUserId,
			WETH,
			receiverSplitConfig.map((r) => ({
				userId: r.userId,
				weight: r.weight
			}))
		);

		console.log('Awaiting for the blockchain to update...');
		const expectedCollectable = (await expect(
			() => dripsHub.getCollectableBalanceForUser(receiverUserId, WETH),
			(collectable) => {
				const found = collectable.collectableAmount === 1n;

				if (!found) {
					console.log(`Expected collectable amount to be 1 but was ${collectable.collectableAmount}.`);
				} else {
					console.log('Found.');
				}

				return found;
			},
			60000,
			5000
		)) as CollectableBalance;

		const collectableAfter = await dripsHub.getCollectableBalanceForUser(receiverUserId, WETH);
		console.log(`Collectable amount after receiving is ${collectableAfter.collectableAmount}`);

		assert.equal(expectedCollectable.collectableAmount, 1n);
	}).timeout(THREE_MINS);
});
