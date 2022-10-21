export const getUserAssetConfigById = `#graphql
query getUserAssetConfigById($configId: ID!) {
	userAssetConfig(id: $configId) {
		id
		assetId
		dripsEntries {
			id
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
				id
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
query getDripsSetEventsByUserId($userId: String!) {
  dripsSetEvents(where: {userId: $userId}) {
		id
    userId
    assetId
		receiversHash
    dripsReceiverSeenEvents {
			id
      receiverUserId
			config
    }
    dripsHistoryHash
		balance
    blockTimestamp
		maxEnd
  }
}
`;

export const getDripsReceiverSeenEventsByReceiverId = `#graphql
query getDripsReceiverSeenEventsByReceiverId($receiverUserId: String!) {
  dripsReceiverSeenEvents(where: {receiverUserId: $receiverUserId}) {
		id
    config
		receiverUserId
		senderUserId
		dripsSetEvent {
			id
			userId
			assetId
			receiversHash
		}
    blockTimestamp
  }
}
`;

export const getUserMetadataByUserId = `#graphql
query getUserMetadataByUserId($userId: String!) {
  userMetadataEvent(id: $userId) {
		id
    key
    value
    lastUpdatedBlockTimestamp
  }
}
`;

export const getUserMetadataByKey = `#graphql
query getUserMetadataByKey($key: BigInt!) {
  userMetadataEvents(where: {key: $key}) {
		id
    key
    value
    lastUpdatedBlockTimestamp
  }
}
`;

export const getNftSubAccountsByOwner = `#graphql
query getNftSubAccountsByOwner($ownerAddress: String!) {
	nftSubAccounts(where: {ownerAddress: $ownerAddress}) {
		id
		userId
		assetId
		balance
		lastUpdatedBlockTimestamp
	}
}
`;
