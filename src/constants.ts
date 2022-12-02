import Utils from './utils';

const ASSOCIATED_APP_KEY = 'associatedApp';

const constants = {
	TOTAL_SPLITS_WEIGHT: 1_000_000,
	MAX_DRIPS_RECEIVERS: 100,
	MAX_SPLITS_RECEIVERS: 200,
	AMT_PER_SEC_MULTIPLIER: 1_000_000_000,
	AMT_PER_SEC_EXTRA_DECIMALS: 9,
	ASSOCIATED_APP_KEY,
	ASSOCIATED_APP_KEY_BYTES: Utils.UserMetadata.keyFromString(ASSOCIATED_APP_KEY)
};

export default constants;
