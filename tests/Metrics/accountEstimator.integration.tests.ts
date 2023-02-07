import { InfuraProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import AccountEstimator from '../../src/Metrics/AccountEstimator';
import AddressDriverClient from '../../src/AddressDriver/AddressDriverClient';

dotenv.config();

describe('Estimation integration tests', () => {
	const THREE_MINS = 180000; // In milliseconds.
	const provider = new InfuraProvider('goerli');
	const account1AsSigner = new Wallet(process.env.ACCOUNT_1_SECRET_KEY as string);

	let account1AddressDriverClient: AddressDriverClient;

	beforeEach(async () => {
		account1AddressDriverClient = await AddressDriverClient.create(provider, account1AsSigner);
	});

	it('************', async () => {
		const chainId = 5; // Goerli.
		const userId = await account1AddressDriverClient.getUserId();

		const accountEstimator = await AccountEstimator.create(userId, chainId);

		let estimate = await accountEstimator.estimate([]);

		console.log(estimate);

		await accountEstimator.refreshAccount();

		estimate = await accountEstimator.estimate([]);

		console.log(estimate);
	}).timeout(THREE_MINS);
});
