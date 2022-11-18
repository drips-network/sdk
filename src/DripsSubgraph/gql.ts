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
			id
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

export const getMetadataHistoryByUser = `#graphql
query getMetadataHistoryByUser($userId: String!) {
  userMetadataEvents(where: {userId: $userId}) {
		id
    key
    value
    userId
    lastUpdatedBlockTimestamp
  }
}
`;

export const getMetadataHistoryByUserAndKey = `#graphql
query getMetadataHistoryByUserAndKey($userId: String!, $key: BigInt!) {
  userMetadataEvents(where: {userId: $userId, key: $key}) {
		id
    key
    value
    userId
    lastUpdatedBlockTimestamp
  }
}
`;

export const getLatestUserMetadata = `#graphql
query getLatestUserMetadata($id: ID!) {
  userMetadataByKey(id: $id) {
		id
    key
    value
    userId
		lastUpdatedBlockTimestamp
  }
}
`;

export const getNftSubAccountsByOwner = `#graphql
query getNftSubAccountsByOwner($ownerAddress: Bytes!) {
	nftsubAccounts(where: {ownerAddress: $ownerAddress}) {
		id
		ownerAddress
	}
}
`;
