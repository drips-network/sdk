export type ChainDripsMetadata = {
	readonly NAME: string;
	readonly CYCLE_SECS: string;
	readonly SUBGRAPH_URL: string;
	readonly CONTRACT_DRIPS_HUB: string;
	readonly CONTRACT_ADDRESS_APP: string;
	readonly CONTRACT_DRIPS_HUB_LOGIC: string;
	readonly CONTRACT_ADDRESS_APP_LOGIC: string;
};

// TODO: Update supported chain IDs.
export type SupportedChain = 5 /* Goerli */;
