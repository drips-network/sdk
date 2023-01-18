import { InfuraProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import AddressDriverClient from '../../src/AddressDriver/AddressDriverClient';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import Utils from '../../src/utils';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import { assert } from 'chai';
import { expect } from '../../src/common/internals';
import { UserAssetConfig } from '../../src/DripsSubgraph/types';
import constants from '../../src/constants';

dotenv.config();

describe('DripsHubClient integration tests', () => {
	const THREE_MINS = 180000; // In milliseconds.
	const WETH = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

	it('should squeeze', async () => {
		const provider = new InfuraProvider('goerli');
		const receiverAccount = process.env.ACCOUNT_1 as string;
		const senderAccount = process.env.ACCOUNT_2 as string;

		const senderAccountAsSigner = new Wallet(process.env.ACCOUNT_2_SECRET_KEY as string);

		const senderAddressDriverClient = await AddressDriverClient.create(provider, senderAccountAsSigner);
		const subgraphClient = DripsSubgraphClient.create((await provider.getNetwork()).chainId);
		const dripsHubClient = await DripsHubClient.create(provider, senderAccountAsSigner);

		const senderUserId = await senderAddressDriverClient.getUserId();
		const receiverUserId = await senderAddressDriverClient.getUserIdByAddress(receiverAccount);

		console.log(`Squeezing funds for user ID '${receiverUserId}' to set squeezable balance to 0`);
		await dripsHubClient.squeezeDrips(
			...(await subgraphClient.getArgsForSqueezingAllDrips(receiverUserId, senderUserId, WETH))
		);

		console.log(`Awaiting for the blockchain to update...`);
		const squeezableBalanceBefore = (await expect(
			async () =>
				dripsHubClient.getSqueezableBalance(
					...(await subgraphClient.getArgsForSqueezingAllDrips(receiverUserId, senderUserId, WETH))
				),
			(balance) => {
				const found = balance === 0n;

				if (!found) {
					console.log(`Expected squeezable balance to be 0 but was ${balance}`);
				} else {
					console.log(`Test condition met! Found ${balance} squeezable balance.`);
				}

				return found;
			},
			60000,
			5000
		)) as bigint;

		assert.equal(squeezableBalanceBefore, 0n);

		console.log(
			`Will update WETH ('${WETH}') Drips configuration for account '${senderAccount}' (user ID: '${senderUserId}').`
		);

		const wEthConfigurationBefore = await subgraphClient.getUserAssetConfigById(
			senderUserId,
			Utils.Asset.getIdFromAddress(WETH)
		);
		console.log(
			`Drips receivers before updating are: ${wEthConfigurationBefore?.dripsEntries.map(
				(d) => `id: ${d.id}, userId: ${d.userId}, config: ${d.config}`
			)}`
		);

		const config = Utils.DripsReceiverConfiguration.toUint256({
			start: BigInt(0),
			duration: BigInt(0),
			amountPerSec: BigInt(1 * constants.AMT_PER_SEC_MULTIPLIER),
			dripId: BigInt(Math.floor(Math.random() * 1_000_000_000))
		});

		console.log(
			`New WETH configuration will be dripping to receiver '${receiverAccount}' (user ID: '${receiverUserId}').`
		);

		console.log(`Updating Drips configuration...`);
		await senderAddressDriverClient.setDrips(
			WETH,
			wEthConfigurationBefore?.dripsEntries.map((d) => ({
				config: d.config,
				userId: d.userId
			})) || [],
			[{ config, userId: receiverUserId }],
			senderAccount
		);

		console.log(`Querying the subgraph until it's updated...`);
		const expectedConfig = (await expect(
			() => subgraphClient.getUserAssetConfigById(senderUserId, Utils.Asset.getIdFromAddress(WETH)),
			(configuration) => {
				const found =
					configuration?.dripsEntries.length === 1 &&
					configuration.dripsEntries[0].config === config &&
					configuration.dripsEntries[0].userId === receiverUserId;

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

		assert.equal(expectedConfig.dripsEntries[0].userId, receiverUserId);

		const squeezableBalanceAfter = (await expect(
			async () =>
				dripsHubClient.getSqueezableBalance(
					...(await subgraphClient.getArgsForSqueezingAllDrips(receiverUserId, senderUserId, WETH))
				),
			(balance) => {
				const found = balance > 0;

				if (!found) {
					console.log(`Expected squeezable balance to be greater than 0 but was ${balance}`);
				} else {
					console.log(`Test condition met! Found ${balance} squeezable balance.`);
				}

				return found;
			},
			60000,
			5000
		)) as bigint;

		assert.isTrue(squeezableBalanceAfter > 0);

		console.log(`Clearing WETH configuration receivers...`);
		await senderAddressDriverClient.setDrips(
			WETH,
			expectedConfig.dripsEntries.map((d) => ({
				config: d.config,
				userId: d.userId
			})),
			[],
			senderAccount
		);
		console.log(`Done.`);
	}).timeout(THREE_MINS);
});
