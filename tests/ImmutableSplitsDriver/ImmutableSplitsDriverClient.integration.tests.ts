import { InfuraProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import ImmutableSplitsDriver from '../../src/ImmutableSplits/ImmutableSplitsDriver';
import AddressDriverClient from '../../src/AddressDriver/AddressDriverClient';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import { assert } from 'chai';
import { SplitsReceiverStruct, UserMetadata } from '../../src/common/types';
import { expect } from '../../src/common/internals';
import { SplitsEntry, UserMetadataEntry } from '../../src/DripsSubgraph/types';

dotenv.config();

describe('ImmutableSplitsDriver integration tests', () => {
	const THREE_MINS = 180000; // In milliseconds.

	it.skip('should create immutable splits', async () => {
		const provider = new InfuraProvider('goerli');
		const account1 = process.env.ACCOUNT_1 as string;
		const account2 = process.env.ACCOUNT_2 as string;
		const account1AsSigner = new Wallet(process.env.ACCOUNT_1_SECRET_KEY as string);

		const account1addressDriverClient = await AddressDriverClient.create(provider, account1AsSigner);

		const userId1 = await account1addressDriverClient.getUserId();
		const userId2 = await account1addressDriverClient.getUserIdByAddress(account2);

		console.log(
			`'${account1}' (user ID: '${userId1}') will create an Immutable Splits configuration with sole receiver '${account2}' (user ID: '${userId2}').`
		);

		const client = await ImmutableSplitsDriver.create(provider, account1AsSigner);

		const receivers: SplitsReceiverStruct[] = [
			{
				userId: userId2,
				weight: 1000000
			}
		];

		const metadata: UserMetadata[] = [
			{
				key: 'key',
				value: 'immutable splits'
			}
		];

		console.log('Creating...');
		const newUserId = await client.createSplits(receivers, metadata);
		console.log(`Created. New User ID is '${newUserId}'.`);

		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);

		console.log(`Querying the subgraph until it's updated...`);
		const immutableSplits = (await expect(
			() => subgraphClient.getSplitsConfigByUserId(newUserId),
			(immutableSplits) => {
				const found =
					immutableSplits.length === 1 &&
					immutableSplits[0].senderId === newUserId &&
					immutableSplits[0].userId === userId2 &&
					immutableSplits[0].weight === 1000000n;

				if (!found) {
					console.log(`Did not found the expected Immutable Splits configuration.`);
				} else {
					console.log('Found.');
				}

				return found;
			},
			60000,
			5000
		)) as SplitsEntry[];
		const latestMetadata = (await expect(
			() => subgraphClient.getLatestUserMetadata(newUserId, 'key'),
			(latestMetadata) => {
				const found =
					latestMetadata?.key === metadata[0].key &&
					latestMetadata.value === metadata[0].value &&
					latestMetadata.userId === newUserId &&
					latestMetadata.id === `${newUserId}-${metadata[0].key}`;

				if (!found) {
					console.log(`Did not found the expected Immutable Splits configuration.`);
				} else {
					console.log('Found.');
				}

				return found;
			},
			60000,
			5000
		)) as UserMetadataEntry;

		assert.equal(immutableSplits[0].userId, userId2);
		assert.equal(latestMetadata.userId, newUserId);
	}).timeout(THREE_MINS);
});
