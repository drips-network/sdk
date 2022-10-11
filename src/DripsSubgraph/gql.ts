export const getUserAssetConfigById = `#graphql
query getUserAssetConfigById($configId: ID!) {
	userAssetConfig(id: $configId) {
		id
		assetId
		dripsEntries {
			userId
			config
		}
		balance
		amountCollected
		lastUpdatedBlockTimestamp
	}
}
`;

export const getAllUserAssetConfigsByUserId = `#graphql
query getAllUserAssetConfigsByUserId($userId: ID!) {
  user(id: $userId) {
    assetConfigs {
      id
			assetId
			dripsEntries {
				userId
				config
			}
			balance
			amountCollected
			lastUpdatedBlockTimestamp
    }
  }
}
`;

export const getSplitsConfigByUserId = `#graphql
query getSplitsConfigByUserId($userId: ID!) {
  user(id: $userId) {
		splitsEntries {
			userId
			weight
		}
  }
}
`;

export const getDripsSetEventsByUserId = `#graphql
query getDripsSetEventsByUserId($userId: BigInt!) {
  dripsSetEvents(where: {userId: $userId}) {
    userId
    assetId
    dripsReceiverSeenEvents {
      receiverUserId
    }
    dripsHistoryHash
		balance
    blockTimestamp
		maxEnd
  }
}
`;

export const getDripsReceiverSeenEventsByReceiverId = `#graphql
query getDripsReceiverSeenEventsByReceiverId($receiverId: BigInt!) {
  dripsReceiverSeenEvents(where: {receiverUserId: $receiverId}) {
    senderUserId
		dripsSetEvent
  }
}
`;
