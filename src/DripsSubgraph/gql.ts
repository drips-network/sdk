export const getAllUserAssetConfigs = `#graphql
query getAllUserAssetConfigs($userId: ID!) {
  user(id: $userId) {
    assetConfigs {
      id
			assetId
			balance
			amountCollected
      dripsEntries {
        config
        receiverUserId
      }
      lastUpdatedBlockTimestamp
    }
  }
}
`;

export const getSplitEntries = `#graphql
query getSplitEntries($userId: ID!) {
  user(id: $userId) {
		splitsEntries {
			receiverUserId
			weight
		}
  }
}
`;

export const getUserAssetConfigById = `#graphql
query getUserAssetConfigById($configId: ID!) {
	userAssetConfig(id: $configId) {
		id
		assetId
		balance
		amountCollected
		dripsEntries {
			config
			receiverUserId
		}
		lastUpdatedBlockTimestamp
	}
}
`;
