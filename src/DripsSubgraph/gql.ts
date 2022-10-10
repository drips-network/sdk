export const getAllUserAssetConfigsByUserId = `#graphql
query getAllUserAssetConfigsByUserId($userId: ID!) {
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

export const getSplitsConfigByUserId = `#graphql
query getSplitsConfigByUserId($userId: ID!) {
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

export const getDripsSetEventsByUserId = `#graphql
query getDripsSetEventsByUserId($userId: BigInt!) {
  dripsSetEvents(where: {userId: $userId}) {
    userId
    assetId
    dripsHistoryHash
    dripsReceiverSeenEvents {
      receiverUserId
    }
    blockTimestamp
		maxEnd
		balance
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
