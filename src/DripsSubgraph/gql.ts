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
query getAllUserAssetConfigsByUserId($userId: ID!, $skip: Int, $first: Int) {
  user(id: $userId) {
    assetConfigs(skip: $skip, first: $first) {
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
query getSplitsConfigByUserId($userId: ID!, $skip: Int, $first: Int) {
  user(id: $userId) {
		splitsEntries(skip: $skip, first: $first) {
			id
    	sender {
      	id
    	}
    	userId
    	weight
		}
  }
}
`;

export const getSplitEntriesByReceiverUserId = `#graphql
query getSplitEntriesByReceiverUserId($receiverUserId: String!, $skip: Int, $first: Int) {
  splitsEntries(where: {userId: $receiverUserId}, skip: $skip, first: $first) {
    id
    sender {
      id
    }
    userId
    weight
  }
}
`;

export const getDripsSetEventsByUserId = `#graphql
query getDripsSetEventsByUserId($userId: String!, $skip: Int, $first: Int) {
  dripsSetEvents(where: {userId: $userId}, skip: $skip, first: $first) {
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
query getDripsReceiverSeenEventsByReceiverId($receiverUserId: String!, $skip: Int, $first: Int) {
  dripsReceiverSeenEvents(where: {receiverUserId: $receiverUserId}, skip: $skip, first: $first) {
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
query getMetadataHistoryByUser($userId: String!,$skip: Int, $first: Int) {
  userMetadataEvents(where: {userId: $userId}, skip: $skip, first: $first) {
		id
    key
    value
    userId
    lastUpdatedBlockTimestamp
  }
}
`;

export const getMetadataHistoryByUserAndKey = `#graphql
query getMetadataHistoryByUserAndKey($userId: String!, $key: Bytes!, $skip: Int, $first: Int) {
  userMetadataEvents(where: {userId: $userId, key: $key}, skip: $skip, first: $first) {
		id
    key
    value
    userId
    lastUpdatedBlockTimestamp
  }
}
`;

export const getMetadataHistoryByKeyAndValue = `#graphql
query getMetadataHistoryByKeyAndValue($key: Bytes!, $value: Bytes!, $skip: Int, $first: Int) {
  userMetadataEvents(where: {key: $key, value: $value}, skip: $skip, first: $first) {
		id
    key
    value
    userId
    lastUpdatedBlockTimestamp
  }
}
`;

export const getNftSubAccountsByOwner = `#graphql
query getNftSubAccountsByOwner($ownerAddress: Bytes!, $skip: Int, $first: Int) {
	nftsubAccounts(where: {ownerAddress: $ownerAddress}, skip: $skip, first: $first) {
		id
		ownerAddress
	}
}
`;

export const getCollectedEventsByUserId = `#graphql
query getCollectedEventsByUserId($userId: String!, $skip: Int, $first: Int) {
  collectedEvents(where: {user: $userId}, skip: $skip, first: $first) {
		id
		user {
			id
		}
		assetId
		collected
		blockTimestamp
	}
}
`;

export const getSplitEventsByUserId = `#graphql
query getSplitEventsByUserId($userId: String!, $skip: Int, $first: Int) {
  splitEvents(where: {userId: $userId}, skip: $skip, first: $first) {
		id
		userId
		receiverId
		assetId
		amt
		blockTimestamp
	}
}
`;

export const getReceivedDripsEventsByUserId = `#graphql
query getReceivedDripsEventsByUserId($userId: String!, $skip: Int, $first: Int) {
  receivedDripsEvents(where: {userId: $userId}, skip: $skip, first: $first) {
		id
		userId
		receivableCycles
		assetId
		amt
		blockTimestamp
	}
}
`;

export const getGivenEventsByUserId = `#graphql
query getGivenEventsByUserId($userId: String!, $skip: Int, $first: Int) {
  givenEvents(where: {userId: $userId}, skip: $skip, first: $first) {
		id
		userId
		receiverUserId
		assetId
		amt
		blockTimestamp
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
