import { InfuraProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import NFTDriverClient from '../../src/NFTDriver/NFTDriverClient';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import Utils from '../../src/utils';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import { assert } from 'chai';
import { createFromStrings, expect } from '../../src/common/internals';
import { NftSubAccount, SplitsEntry, UserAssetConfig, UserMetadataEntry } from '../../src/DripsSubgraph/types';
import { CollectableBalance } from '../../src/DripsHub/types';

dotenv.config();

describe('NFTDriver integration tests', () => {
	const THREE_MINS = 180000; // In milliseconds.
	const WETH = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

	it('should create a new sub-account and transfer its ownership', async () => {
		const provider = new InfuraProvider('goerli');

		const account1 = process.env.ACCOUNT_1 as string;
		const account2 = process.env.ACCOUNT_2 as string;

		const account1AsSigner = new Wallet(process.env.ACCOUNT_1_SECRET_KEY as string);

		const account1NftDriverClient = await NFTDriverClient.create(provider, account1AsSigner);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		console.log(`'${account1}' will create a new sub-account and transfer it to '${account2}'.`);

		const subAccountsBefore = await subgraphClient.getNftSubAccountsByOwner(account2);
		console.log(
			`'${account2}' has the following ${subAccountsBefore.length} sub-accounts already: ${subAccountsBefore.map(
				(a) => `\r\n${a.tokenId}`
			)}`
		);

		const associatedApp = `integration-tests`;
		console.log(
			`Creating new sub-account and transferring to '${account2}' and associating it with '${associatedApp}' app...`
		);
		const tokenId = await account1NftDriverClient.safeCreateAccount(account2, associatedApp);
		console.log(`New account token is '${tokenId}'.`);

		console.log(`Querying the subgraph until it's updated...`);
		const expectedAccounts = (await expect(
			() => subgraphClient.getNftSubAccountsByOwner(account2),
			(subAccounts) => {
				const found =
					subAccounts.length === subAccountsBefore.length + 1 &&
					subAccounts.some((a) => a.tokenId === tokenId && !subAccountsBefore.some((a) => a.tokenId === tokenId));

				if (!found) {
					console.log(`Retrieved ${subAccounts.length} but expected ${subAccountsBefore.length + 1} accounts.`);
				} else {
					console.log('Test condition met!');
				}

				return found;
			},
			60000,
			5000
		)) as NftSubAccount[];

		assert.isTrue(expectedAccounts.some((a) => a.tokenId === tokenId));
	}).timeout(THREE_MINS);

	it("should update a sub-account's WETH Drips configuration", async () => {
		const provider = new InfuraProvider('goerli');
		const account2 = process.env.ACCOUNT_2 as string;

		const account2AsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const account2NftDriverClient = await NFTDriverClient.create(provider, account2AsSigner);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		console.log(`Will update WETH ('${WETH}') Drips configuration for one of the sub-accounts owned by '${account2}'.`);

		const subAccounts = await subgraphClient.getNftSubAccountsByOwner(account2);
		if (!subAccounts.length || subAccounts.length < 2) {
			assert.fail(`No sub-accounts found.`);
		}

		const testSubAccount = subAccounts[0];
		console.log(`Selected test sub-account is '${testSubAccount.tokenId}'.`);
		assert.equal(testSubAccount.ownerAddress, account2);

		const wEthConfigurationBefore = await subgraphClient.getUserAssetConfigById(
			testSubAccount.tokenId,
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

		const receiver = subAccounts[1];
		console.log(
			`New WETH configuration will be dripping to receiver '${receiver.tokenId}' (owner: '${receiver.ownerAddress}')`
		);
		assert.equal(receiver.ownerAddress, account2);
		assert.equal(receiver.ownerAddress, testSubAccount.ownerAddress);

		console.log(`Updating Drips configuration...`);
		await account2NftDriverClient.setDrips(
			testSubAccount.tokenId,
			WETH,
			wEthConfigurationBefore?.dripsEntries.map((d) => ({
				config: d.config,
				userId: d.userId
			})) || [],
			[{ config, userId: receiver.tokenId }],
			account2
		);

		console.log(`Querying the subgraph until it's updated...`);
		const expectedConfig = (await expect(
			() => subgraphClient.getUserAssetConfigById(testSubAccount.tokenId, Utils.Asset.getIdFromAddress(WETH)),
			(configuration) => {
				const found =
					configuration?.dripsEntries.length === 1 &&
					configuration.dripsEntries[0].config === config &&
					configuration.dripsEntries[0].userId === receiver.tokenId;

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

		assert.equal(expectedConfig.dripsEntries[0].userId, receiver.tokenId);

		console.log(`Clearing WETH configuration receivers...`);
		await account2NftDriverClient.setDrips(
			testSubAccount.tokenId,
			WETH,
			expectedConfig.dripsEntries.map((d) => ({
				config: d.config,
				userId: d.userId
			})),
			[],
			account2
		);
		console.log(`Done.`);
	}).timeout(THREE_MINS);

	it("should update a sub-account's Splits configuration", async () => {
		const provider = new InfuraProvider('goerli');
		const account2 = process.env.ACCOUNT_2 as string;

		const account2AsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const account2NftDriverClient = await NFTDriverClient.create(provider, account2AsSigner);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		console.log(`Will update Splits configuration for one of the sub-accounts owned by '${account2}'.`);

		const subAccounts = await subgraphClient.getNftSubAccountsByOwner(account2);
		if (!subAccounts.length || subAccounts.length < 2) {
			assert.fail(`No sub-accounts found.`);
		}

		const testSubAccount = subAccounts[0];
		console.log(`Selected test sub-account is '${testSubAccount.tokenId}'.`);
		assert.equal(testSubAccount.ownerAddress, account2);

		const splitsConfigurationBefore = await subgraphClient.getSplitsConfigByUserId(testSubAccount.tokenId);
		console.log(
			`Current Splits configuration receivers: ${splitsConfigurationBefore.map(
				(d) => `id: ${d.id}, userId: ${d.userId}, senderId: ${d.senderId}, weight: ${d.weight}`
			)}`
		);

		const receiver = subAccounts[1];
		console.log(
			`New Splits configuration will be splitting to receiver '${receiver.tokenId}' (owner: '${receiver.ownerAddress}')`
		);
		assert.equal(receiver.ownerAddress, account2);
		assert.equal(receiver.ownerAddress, testSubAccount.ownerAddress);

		console.log(`Updating Splits configuration...`);
		await account2NftDriverClient.setSplits(testSubAccount.tokenId, [
			{
				userId: receiver.tokenId,
				weight: 1
			}
		]);

		console.log(`Querying the subgraph until it's updated...`);
		const expectedConfig = (await expect(
			() => subgraphClient.getSplitsConfigByUserId(testSubAccount.tokenId),
			(configuration) => {
				const found =
					configuration?.length === 1 && configuration[0].weight === 1n && configuration[0].userId === receiver.tokenId;

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

		assert.equal(expectedConfig[0].userId, receiver.tokenId);

		console.log(`Clearing Splits configuration receivers...`);
		await account2NftDriverClient.setSplits(testSubAccount.tokenId, []);
		console.log(`Done.`);
	}).timeout(THREE_MINS);

	it('should emit user metadata for a sub-account', async () => {
		const provider = new InfuraProvider('goerli');
		const account2 = process.env.ACCOUNT_2 as string;

		const account2AsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const account2NftDriverClient = await NFTDriverClient.create(provider, account2AsSigner);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		console.log(`Will emit user metadata for one of the sub-accounts owned by '${account2}'.`);

		const subAccounts = await subgraphClient.getNftSubAccountsByOwner(account2);
		if (!subAccounts.length || subAccounts.length < 2) {
			assert.fail(`No sub-accounts found.`);
		}

		const testSubAccount = subAccounts[0];
		console.log(`Selected test sub-account is '${testSubAccount.tokenId}'.`);
		assert.equal(testSubAccount.ownerAddress, account2);

		const splitsConfigurationBefore = await subgraphClient.getSplitsConfigByUserId(testSubAccount.tokenId);
		console.log(
			`Current Splits configuration receivers: ${splitsConfigurationBefore.map(
				(d) => `id: ${d.id}, userId: ${d.userId}, senderId: ${d.senderId}, weight: ${d.weight}`
			)}`
		);

		const receiver = subAccounts[1];
		console.log(
			`New Splits configuration will be splitting to receiver '${receiver.tokenId}' (owner: '${receiver.ownerAddress}')`
		);
		assert.equal(receiver.ownerAddress, account2);
		assert.equal(receiver.ownerAddress, testSubAccount.ownerAddress);

		const key = BigInt(Math.floor(Math.random() * 1_000_000_000)).toString();
		const value = `${key}-value`;
		const metadata = createFromStrings(key, value);

		assert.isNull(await subgraphClient.getLatestUserMetadata(testSubAccount.tokenId, key));

		console.log(
			`Emitting metadata with key: ${key} (${metadata.key}) and value: ${value} (${metadata.value}) for test user ${testSubAccount.tokenId}`
		);
		await account2NftDriverClient.emitUserMetadata(testSubAccount.tokenId, [
			{
				key: key,
				value: value
			}
		]);
		console.log('Emitted.');

		console.log(`Querying the subgraph until it's updated...`);
		const expectedMetadata = (await expect(
			() => subgraphClient.getLatestUserMetadata(testSubAccount.tokenId, key),
			(latestMetadataEntry) => {
				const found =
					latestMetadataEntry?.key === key &&
					latestMetadataEntry.value === value &&
					latestMetadataEntry.userId === testSubAccount.tokenId &&
					latestMetadataEntry.id === `${testSubAccount.tokenId}-${key}`;

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

		assert.equal(expectedMetadata.id, `${testSubAccount.tokenId}-${key}`);
	}).timeout(THREE_MINS);

	it("should give from a sub-account's owner to another address", async () => {
		const provider = new InfuraProvider('goerli');

		const account1 = process.env.ACCOUNT_1 as string;
		const account2 = process.env.ACCOUNT_2 as string;

		const account1AsSigner = new Wallet(process.env.ACCOUNT_1_SECRET_KEY as string);
		const account2AsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const giveClient = await NFTDriverClient.create(provider, account1AsSigner);
		const receiverClient = await NFTDriverClient.create(provider, account2AsSigner);

		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		const subAccounts1 = await subgraphClient.getNftSubAccountsByOwner(account1);
		if (!subAccounts1.length || subAccounts1.length < 2) {
			assert.fail(`No sub-accounts found for '${account1}'.`);
		}

		const giveAccount = subAccounts1[0];
		console.log(`Selected give sub-account is ${giveAccount.tokenId} (Wallet: ${giveAccount.ownerAddress}).`);
		assert.equal(giveAccount.ownerAddress, account1);

		const subAccounts2 = await subgraphClient.getNftSubAccountsByOwner(account2);
		if (!subAccounts2.length || subAccounts2.length < 2) {
			assert.fail(`No sub-accounts found for '${account2}'.`);
		}

		const receiverAccount = subAccounts2[0];
		console.log(
			`Selected receiver sub-account is ${receiverAccount.tokenId} (Wallet: ${receiverAccount.ownerAddress}).`
		);
		assert.equal(receiverAccount.ownerAddress, account2);

		console.log('Setting splits to empty array for the receiver...');
		await receiverClient.setSplits(receiverAccount.tokenId, []);

		console.log('Awaiting for the blockchain to update...');
		(await expect(
			() => subgraphClient.getSplitsConfigByUserId(receiverAccount.tokenId),
			(configuration) => {
				return configuration.length === 0;
			},
			60000,
			5000
		)) as SplitsEntry[];

		const dripsHub = await DripsHubClient.create(provider, account1AsSigner);

		console.log("Collecting for receiver to reset receiver's collectable amount to 0...");
		await receiverClient.collect(receiverAccount.tokenId, WETH, receiverAccount.ownerAddress);

		console.log('Awaiting for the blockchain to update...');
		(await expect(
			() => dripsHub.getCollectableBalanceForUser(receiverAccount.tokenId, WETH),
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
		await giveClient.give(giveAccount.tokenId, receiverAccount.tokenId, WETH, 1);
		console.log('Successfully gave...');
		console.log('Awaiting for the blockchain to update...');
		await expect(
			() => 1,
			() => false,
			40000,
			30000
		);

		const receiverSplitConfig = await subgraphClient.getSplitsConfigByUserId(receiverAccount.tokenId);

		console.log('Splitting before collecting...');
		await dripsHub.split(
			receiverAccount.tokenId,
			WETH,
			receiverSplitConfig.map((r) => ({
				userId: r.userId,
				weight: r.weight
			}))
		);

		console.log('Awaiting for the blockchain to update...');
		const expectedCollectable = (await expect(
			() => dripsHub.getCollectableBalanceForUser(receiverAccount.tokenId, WETH),
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

		const collectableAfter = await dripsHub.getCollectableBalanceForUser(receiverAccount.tokenId, WETH);
		console.log(`Collectable amount after receiving is ${collectableAfter.collectableAmount}`);

		assert.equal(expectedCollectable.collectableAmount, 1n);
	}).timeout(THREE_MINS);
});
