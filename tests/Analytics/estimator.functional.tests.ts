import AccountEstimator from '../../src/Analytics/AccountEstimator/AccountEstimator';

describe('AccountEstimator', () => {
	it('', async () => {
		const chainId = 1;
		const userId = '0x0000000000000000000000000000000000000000';

		const accountEstimator = await AccountEstimator.create(userId, chainId);

		let estimate = accountEstimator.estimate([]);

		console.log(estimate);

		await accountEstimator.refreshAccount();

		estimate = accountEstimator.estimate([]);

		console.log(estimate);
	});
});
