import { assert } from 'chai';
import { exec } from 'child_process';
import { ethers } from 'ethers';

async function launchAnvil() {
	console.log('Forking chain ...');
	exec('kill -9 $(pgrep anvil)');
	const anvil = exec(`anvil --silent --fork-url ${process.env.FORK_URL}`);

	let serverReady = false;
	anvil.stdout.on('data', (data: any) => {
		const output = data.toString();
		if (output.includes('Listening')) {
			serverReady = true;
		}
		console.log(`${data}`);
	});

	anvil.stderr.on('data', (data: any) => {
		console.log(`${data}`);
	});

	const retries = 200;
	for (let i = 0; i < retries; i++) {
		if (serverReady) {
			console.log('anvil server ready');
			break;
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
}


describe('Integration Tests', async () => {

    let provider: ethers.providers.JsonRpcProvider;

    await launchAnvil();

    beforeAll(async () => {
        provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    })

    afterAll(() => {
        exec('kill -9 $(pgrep anvil)');
    });
});