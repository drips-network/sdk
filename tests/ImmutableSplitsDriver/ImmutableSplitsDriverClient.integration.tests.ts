import { InfuraProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { assert } from 'chai';
import ImmutableSplitsDriver from '../../src/ImmutableSplits/ImmutableSplitsDriverClient';
import AddressDriverClient from '../../src/AddressDriver/AddressDriverClient';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import type { SplitsReceiverStruct, UserMetadata } from '../../src/common/types';
import { expect } from '../../src/common/internals';
import type { SplitsEntry, UserMetadataEntry } from '../../src/DripsSubgraph/types';

dotenv.config();

describe('ImmutableSplitsDriver integration tests', () => {
	const THREE_MINS = 180000; // In milliseconds.

	it('should create immutable splits', async () => {
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

		console.log('Querying the Subgraph until the new Immutable Splits configuration is found...');
		const immutableSplits = (await expect(
			() => subgraphClient.getSplitsConfigByUserId(newUserId),
			(currentImmutableSplits) => {
				const found =
					currentImmutableSplits.length === 1 &&
					currentImmutableSplits[0].senderId === newUserId &&
					currentImmutableSplits[0].userId === userId2 &&
					currentImmutableSplits[0].weight === 1000000n;

				if (!found) {
					console.log(`Did not found the expected Immutable Splits configuration.`);
				} else {
					console.log('Expected Immutable Splits configuration found!');
				}

				return found;
			},
			60000,
			5000
		)) as SplitsEntry[];

		console.log(`Querying the subgraph until the new metadata is found...`);
		const latestMetadata = (await expect(
			() => subgraphClient.getLatestUserMetadata(newUserId, 'key'),
			(currentLatestMetadata) => {
				const found =
					currentLatestMetadata?.key === metadata[0].key &&
					currentLatestMetadata.value === metadata[0].value &&
					currentLatestMetadata.userId === newUserId &&
					currentLatestMetadata.id === `${newUserId}-${metadata[0].key}`;

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

		assert.equal(immutableSplits[0].userId, userId2);
		assert.equal(latestMetadata.userId, newUserId);
	}).timeout(THREE_MINS);
});
