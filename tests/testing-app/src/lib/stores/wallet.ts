import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { ethers } from 'ethers';

// Type definitions
interface WalletState {
	isConnected: boolean;
	address: string | null;
	provider: ethers.BrowserProvider | null;
	signer: ethers.JsonRpcSigner | null;
	isConnecting: boolean;
	error: string | null;
}

// Wallet connection state
export const walletStore = writable<WalletState>({
	isConnected: false,
	address: null,
	provider: null,
	signer: null,
	isConnecting: false,
	error: null
});

// Check if MetaMask is available
export function isMetaMaskAvailable(): boolean {
	return browser && typeof window.ethereum !== 'undefined';
}

// Connect to MetaMask
export async function connectWallet(): Promise<void> {
	if (!browser) return;
	
	walletStore.update(state => ({ ...state, isConnecting: true, error: null }));
	
	try {
		if (!isMetaMaskAvailable()) {
			throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
		}

		// Request account access
		const accounts: string[] = await window.ethereum!.request({
			method: 'eth_requestAccounts'
		});

		if (accounts.length === 0) {
			throw new Error('No accounts found. Please make sure MetaMask is unlocked.');
		}

		// Create provider and signer using ethers
		const provider = new ethers.BrowserProvider(window.ethereum!);
		const signer = await provider.getSigner();
		const address = await signer.getAddress();

		walletStore.set({
			isConnected: true,
			address,
			provider,
			signer,
			isConnecting: false,
			error: null
		});

		// Listen for account changes
		window.ethereum!.on('accountsChanged', handleAccountsChanged);
		window.ethereum!.on('chainChanged', handleChainChanged);

	} catch (error) {
		console.error('Failed to connect wallet:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		walletStore.update(state => ({
			...state,
			isConnecting: false,
			error: errorMessage
		}));
	}
}

// Disconnect wallet
export function disconnectWallet(): void {
	if (browser && window.ethereum) {
		window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
		window.ethereum.removeListener('chainChanged', handleChainChanged);
	}
	
	walletStore.set({
		isConnected: false,
		address: null,
		provider: null,
		signer: null,
		isConnecting: false,
		error: null
	});
}

// Handle account changes
function handleAccountsChanged(accounts: string[]): void {
	if (accounts.length === 0) {
		disconnectWallet();
	} else {
		// Reconnect with new account
		connectWallet();
	}
}

// Handle chain changes
function handleChainChanged(): void {
	// Reload the page when chain changes to avoid stale state
	if (browser) {
		window.location.reload();
	}
}

// Check if already connected on page load
export async function checkConnection(): Promise<void> {
	if (!browser || !isMetaMaskAvailable()) return;
	
	try {
		const accounts: string[] = await window.ethereum!.request({
			method: 'eth_accounts'
		});
		
		if (accounts.length > 0) {
			await connectWallet();
		}
	} catch (error) {
		console.error('Failed to check connection:', error);
	}
}

// Format address for display (show first 6 and last 4 characters)
export function formatAddress(address: string | null): string {
	if (!address) return '';
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Check if write operations are available (either MetaMask connected OR private key can be manually entered)
export function canPerformWriteOperations(): boolean {
	// Write operations are always available because users can manually enter private keys
	// even when MetaMask is not connected
	return true;
}
