export const getUserAssetConfigs = `#graphql
query getUserAssetConfigs($userId: ID!) {
  user(id: $userId) {
		splitsEntries {
			receiverUserId
			weight
		}
    assetConfigs {
      id
      dripsEntries {
        id
        receiverUserId
        config
        sender {
          id
        }
      }
      assetId
      balance
      amountCollected
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
		splitsEntries {
			receiverUserId
			weight
		}
		dripsEntries {
			id
			receiverUserId
			config
			sender {
				id
			}
		}
		assetId
		balance
		amountCollected
		lastUpdatedBlockTimestamp
	}
}
`;
