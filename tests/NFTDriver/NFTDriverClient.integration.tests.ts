import { InfuraProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { assert } from 'chai';
import NFTDriverClient from '../../src/NFTDriver/NFTDriverClient';
import DripsClient from '../../src/Drips/DripsClient';
import Utils from '../../src/utils';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import { expect } from '../../src/common/internals';
import type {
	NftSubAccount,
	SplitsEntry,
	AccountAssetConfig,
	AccountMetadataEntry
} from '../../src/DripsSubgraph/types';
import type { CollectableBalance } from '../../src/Drips/types';
import constants from '../../src/constants';

dotenv.config();

describe('NFTDriver integration tests', () => {
	const THREE_MINS = 180000; // In milliseconds.
	const WETH = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';
	const provider = new InfuraProvider('sepolia');
	const account1 = process.env.ACCOUNT_1 as string;
	const account2 = process.env.ACCOUNT_2 as string;
	const account1AsSigner = new Wallet(process.env.ACCOUNT_1_SECRET_KEY as string);
	const account2AsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

	let dripsHubClient: DripsClient;
	let subgraphClient: DripsSubgraphClient;
	let account1NftDriverClient: NFTDriverClient;
	let account2NftDriverClient: NFTDriverClient;

	beforeEach(async () => {
		dripsHubClient = await DripsClient.create(provider, account1AsSigner);
		subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);
		account1NftDriverClient = await NFTDriverClient.create(provider, account1AsSigner);
		account2NftDriverClient = await NFTDriverClient.create(provider, account2AsSigner);
	});

	it('should create a new sub-account and transfer its ownership', async () => {
		console.log(`${account1} will create a new sub-account and transfer it to ${account2}.`);

		const subAccountsBefore = await subgraphClient.getNftSubAccountsByOwner(account2);
		console.log(`${account2} has ${subAccountsBefore.length} accounts before running the test.`);

		const associatedApp = `integration-tests`;
		console.log(`Creating new sub-account and associating it with '${associatedApp}' app...`);
		const tokenId = await account1NftDriverClient.safeCreateAccount(account2, associatedApp);
		console.log(`Created. New sub-account token is ${tokenId}.`);
		assert.isTrue(!subAccountsBefore.some((a) => a.tokenId === tokenId));

		console.log(
			`Querying the Subgraph until the new account token (${tokenId}) is found in ${account2} sub-accounts...`
		);
		const subAccountsAfter = (await expect(
			() => subgraphClient.getNftSubAccountsByOwner(account2),
			(currentSubAccounts) => {
				const found =
					currentSubAccounts.length === subAccountsBefore.length + 1 &&
					currentSubAccounts.filter((a) => a.tokenId === tokenId).length === 1;
				if (!found) {
					console.log(`New token not found yet...`);
				} else {
					console.log('New token found!');
				}

				return found;
			},
			60000,
			5000
		)) as NftSubAccount[];

		assert.isTrue(subAccountsAfter.some((a) => a.tokenId === tokenId));
	}).timeout(THREE_MINS);

	it("should set sub-account's Drips configuration", async () => {
		console.log(`Will update WETH (${WETH}) Drips configuration for one of the sub-accounts owned by ${account2}.`);

		const subAccounts = await subgraphClient.getNftSubAccountsByOwner(account2);
		if (!subAccounts.length || subAccounts.length < 2) {
			assert.fail(
				`Cannot run test: account ${account2} needs at least 2 sub-account for the test to run but found ${subAccounts.length}.`
			);
		}

		const senderSubAccount = subAccounts[0];
		console.log(
			`Selecting the first sub-account as the test sender sub-account. User ID is ${senderSubAccount.tokenId}.`
		);
		assert.equal(senderSubAccount.ownerAddress, account2);

		const wEthConfigurationBefore = await subgraphClient.getAccountAssetConfigById(
			senderSubAccount.tokenId,
			Utils.Asset.getIdFromAddress(WETH)
		);

		console.log(
			`Current WETH Drips configuration has the following receivers: ${
				wEthConfigurationBefore?.streamsEntries.length
					? wEthConfigurationBefore?.streamsEntries.map(
							(d) => `id: ${d.id}, accountId: ${d.accountId}, config: ${d.config}`
					  )
					: '[no receivers or no configuration found]'
			}`
		);

		const config = Utils.StreamConfiguration.toUint256({
			start: BigInt(1),
			duration: BigInt(2),
			amountPerSec: BigInt(3 * constants.AMT_PER_SEC_MULTIPLIER),
			dripId: BigInt(Math.floor(Math.random() * 1_000_000_000))
		});

		const receiverSubAccount = subAccounts[1];
		console.log(
			`Selecting the second sub-account as the test sole receiver sub-account. User ID is ${receiverSubAccount.tokenId}. The new WETH configuration will be dripping only to this receiver.`
		);
		assert.equal(receiverSubAccount.ownerAddress, account2);
		assert.equal(receiverSubAccount.ownerAddress, senderSubAccount.ownerAddress);

		console.log(`Updating Drips configuration...`);
		await account2NftDriverClient.setStreams(
			senderSubAccount.tokenId,
			WETH,
			await subgraphClient.getCurrentStreamsReceivers(senderSubAccount.tokenId, WETH, provider),
			[{ config, accountId: receiverSubAccount.tokenId }],
			account2
		);

		console.log(`Querying the Subgraph until the new WETH Drips configuration is the expected...`);
		const expectedConfig = (await expect(
			() => subgraphClient.getAccountAssetConfigById(senderSubAccount.tokenId, Utils.Asset.getIdFromAddress(WETH)),
			(configuration) => {
				const found =
					configuration?.streamsEntries.length === 1 &&
					configuration.streamsEntries[0].config === config &&
					configuration.streamsEntries[0].accountId === receiverSubAccount.tokenId;

				if (!found) {
					console.log('New Drips configuration not found yet.');
				} else {
					console.log('New Drips configuration found!');
				}

				return found;
			},
			60000,
			5000
		)) as AccountAssetConfig;

		assert.equal(expectedConfig.streamsEntries[0].accountId, receiverSubAccount.tokenId);

		console.log(`Clearing WETH configuration receivers to stop dripping...`);
		await account2NftDriverClient.setStreams(
			senderSubAccount.tokenId,
			WETH,
			await subgraphClient.getCurrentStreamsReceivers(senderSubAccount.tokenId, WETH, provider),
			[],
			account2
		);
		console.log(`Done.`);
	}).timeout(THREE_MINS);

	it("should set sub-account's Splits configuration", async () => {
		console.log(`Will update Splits configuration for one of the sub-accounts owned by ${account2}.`);

		const subAccounts = await subgraphClient.getNftSubAccountsByOwner(account2);
		if (!subAccounts.length || subAccounts.length < 2) {
			assert.fail(
				`Cannot run test: account ${account2} needs at least 2 sub-account for the test to run but found ${subAccounts.length}.`
			);
		}

		const senderSubAccount = subAccounts[0];
		console.log(
			`Selecting the first sub-account as the test sender sub-account. User ID is ${senderSubAccount.tokenId}.`
		);
		assert.equal(senderSubAccount.ownerAddress, account2);

		const splitsConfigurationBefore = await subgraphClient.getSplitsConfigByAccountId(senderSubAccount.tokenId);
		console.log(
			`Current Splits configuration has the following receivers: ${
				splitsConfigurationBefore?.length
					? splitsConfigurationBefore.map(
							(d) => `id: ${d.id}, accountId: ${d.accountId}, senderId: ${d.senderId}, weight: ${d.weight}`
					  )
					: '[no receivers or no configuration found]'
			}`
		);

		const receiverSubAccount = subAccounts[1];
		console.log(
			`Selecting the second sub-account as the test sole receiver sub-account. User ID is ${receiverSubAccount.tokenId}. The new Splits configuration will be splitting only to this receiver.`
		);
		assert.equal(receiverSubAccount.ownerAddress, account2);
		assert.equal(receiverSubAccount.ownerAddress, senderSubAccount.ownerAddress);

		console.log(`Updating Splits configuration...`);
		await account2NftDriverClient.setSplits(senderSubAccount.tokenId, [
			{
				accountId: receiverSubAccount.tokenId,
				weight: 1
			}
		]);

		console.log(`Querying the Subgraph until the new Splits configuration is the expected...`);
		const expectedConfig = (await expect(
			() => subgraphClient.getSplitsConfigByAccountId(senderSubAccount.tokenId),
			(configuration) => {
				const found =
					configuration?.length === 1 &&
					configuration[0].weight === 1n &&
					configuration[0].accountId === receiverSubAccount.tokenId;

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

		assert.equal(expectedConfig[0].accountId, receiverSubAccount.tokenId);

		console.log(`Clearing Splits configuration receivers for stop splitting...`);
		await account2NftDriverClient.setSplits(senderSubAccount.tokenId, []);
		console.log(`Done.`);
	}).timeout(THREE_MINS);

	it('should emit user metadata for a sub-account', async () => {
		console.log(`Will emit user metadata for one of the sub-accounts owned by ${account2}.`);

		const subAccounts = await subgraphClient.getNftSubAccountsByOwner(account2);
		if (!subAccounts.length || subAccounts.length < 2) {
			assert.fail(
				`Cannot run test: account ${account2} needs at least 2 sub-account for the test to run but found ${subAccounts.length}.`
			);
		}

		const emitterSubAccount = subAccounts[0];
		console.log(
			`Selecting the first sub-account as the test emitter sub-account. User ID is ${emitterSubAccount.tokenId}.`
		);
		assert.equal(emitterSubAccount.ownerAddress, account2);

		const key = BigInt(Math.floor(Math.random() * 1_000_000_000)).toString();
		const value = `${key}-value`;
		const metadata = Utils.Metadata.createFromStrings(key, value);

		assert.isNull(await subgraphClient.getLatestAccountMetadata(emitterSubAccount.tokenId, key));

		console.log(`Emitting metadata with key: ${key} (${metadata.key}) and value: ${value} (${metadata.value})...`);
		await account2NftDriverClient.emitAccountMetadata(emitterSubAccount.tokenId, [
			{
				key,
				value
			}
		]);
		console.log('Emitted.');

		console.log(`Querying the subgraph until the new metadata is found...`);
		const expectedMetadata = (await expect(
			() => subgraphClient.getLatestAccountMetadata(emitterSubAccount.tokenId, key),
			(latestMetadataEntry) => {
				const found =
					latestMetadataEntry?.key === key &&
					latestMetadataEntry.value === value &&
					latestMetadataEntry.accountId === emitterSubAccount.tokenId &&
					latestMetadataEntry.id === `${emitterSubAccount.tokenId}-${key}`;

				if (!found) {
					console.log('Emitted metadata not found yet.');
				} else {
					console.log('Emitted metadata found!');
				}

				return found;
			},
			60000,
			5000
		)) as AccountMetadataEntry;

		assert.equal(expectedMetadata.id, `${emitterSubAccount.tokenId}-${key}`);
	}).timeout(THREE_MINS);

	it("should give from a sub-account's owner to another address", async () => {
		const giveClient = account1NftDriverClient;
		const receiverClient = account2NftDriverClient;

		const subAccounts1 = await subgraphClient.getNftSubAccountsByOwner(account1);
		if (!subAccounts1.length || subAccounts1.length < 2) {
			assert.fail(
				`Cannot run test: account ${account1} needs at least 2 sub-account for the test to run but found ${subAccounts1.length}.`
			);
		}

		const giveSubAccount = subAccounts1[0];
		console.log(
			`Selecting the first sub-account owned by ${account1} as the test giver sub-account. User ID is ${giveSubAccount.tokenId}.`
		);
		assert.equal(giveSubAccount.ownerAddress, account1);

		await giveClient.approve(WETH);
		await receiverClient.approve(WETH);

		const subAccounts2 = await subgraphClient.getNftSubAccountsByOwner(account2);
		if (!subAccounts2.length || subAccounts2.length < 2) {
			assert.fail(
				`Cannot run test: account ${account2} needs at least 2 sub-account for the test to run but found ${subAccounts2.length}.`
			);
		}

		const receiveSubAccount = subAccounts2[0];
		console.log(
			`Selecting the first sub-account owned by ${account2} as the test receiver sub-account. User ID is ${receiveSubAccount.tokenId}.`
		);
		assert.equal(receiveSubAccount.ownerAddress, account2);

		console.log('Setting splits to empty array for the receiver...');
		await receiverClient.setSplits(receiveSubAccount.tokenId, []);

		console.log("Querying the Subgraph until receiver's Splits are cleared...");
		(await expect(
			() => subgraphClient.getSplitsConfigByAccountId(receiveSubAccount.tokenId),
			(configuration) => configuration.length === 0,
			60000,
			5000
		)) as SplitsEntry[];

		console.log("Collecting for receiver to reset receiver's collectable amount to 0...");
		await receiverClient.collect(receiveSubAccount.tokenId, WETH, receiveSubAccount.ownerAddress);

		console.log("Querying the Subgraph until receiver's collectable amount is 0...");
		(await expect(
			() => dripsHubClient.getCollectableBalanceForUser(receiveSubAccount.tokenId, WETH),
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

		console.log(
			`Giving from ${giveSubAccount.tokenId} (owner: ${giveSubAccount.ownerAddress}) to ${receiveSubAccount.tokenId} (owner: ${receiveSubAccount.ownerAddress})...`
		);
		await giveClient.give(giveSubAccount.tokenId, receiveSubAccount.tokenId, WETH, 1);
		console.log('Successfully gave...');
		console.log('Awaiting for the Subgraph to update...');
		await expect(
			() => 1,
			() => false,
			40000,
			30000
		);

		const receiverSplitConfig = await subgraphClient.getSplitsConfigByAccountId(receiveSubAccount.tokenId);

		console.log('Splitting before collecting...');
		await dripsHubClient.split(
			receiveSubAccount.tokenId,
			WETH,
			receiverSplitConfig.map((r) => ({
				accountId: r.accountId,
				weight: r.weight
			}))
		);

		console.log("Querying the Subgraph until receiver's collectable amount is the expected...");
		const expectedCollectable = (await expect(
			() => dripsHubClient.getCollectableBalanceForUser(receiveSubAccount.tokenId, WETH),
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

		assert.equal(expectedCollectable.collectableAmount, 1n);
	}).timeout(THREE_MINS);
});
