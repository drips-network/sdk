export const getUserAssetConfigById = `#graphql
query getUserAssetConfigById($configId: ID!) {
	userAssetConfig(id: $configId) {
		id
		assetId
		streamsEntries {
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
			streamsEntries {
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

export const getStreamsSetEventsByUserId = `#graphql
query getStreamsSetEventsByUserId($userId: String!, $skip: Int, $first: Int) {
  streamsSetEvents(where: {userId: $userId}, skip: $skip, first: $first) {
		id
    userId
    assetId
		receiversHash
    streamReceiverSeenEvents {
			id
      receiverUserId
			config
    }
    streamsHistoryHash
		balance
    blockTimestamp
		maxEnd
  }
}
`;

export const getStreamReceiverSeenEventsByReceiverId = `#graphql
query getStreamReceiverSeenEventsByReceiverId($receiverUserId: String!, $skip: Int, $first: Int) {
  streamReceiverSeenEvents(where: {receiverUserId: $receiverUserId}, skip: $skip, first: $first) {
		id
    config
		receiverUserId
		senderUserId
		streamsSetEvent {
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

export const getNftSubAccountOwnerByTokenId = `#graphql
query getNftSubAccountOwnerByTokenId($tokenId: ID!) {
	nftsubAccount(id: $tokenId) {
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

export const getSplitEventsByReceiverUserId = `#graphql
query getSplitEventsByReceiverUserId($receiverUserId: String!, $skip: Int, $first: Int) {
  splitEvents(where: {receiverId: $receiverUserId}, skip: $skip, first: $first) {
		id
		userId
		receiverId
		assetId
		amt
		blockTimestamp
	}
}
`;

export const getReceivedStreamsEventsByUserId = `#graphql
query getReceivedStreamsEventsByUserId($userId: String!, $skip: Int, $first: Int) {
  receivedStreamsEvents(where: {userId: $userId}, skip: $skip, first: $first) {
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

export const getGivenEventsByReceiverUserId = `#graphql
query getGivenEventsByReceiverUserId($receiverUserId: String!, $skip: Int, $first: Int) {
  givenEvents(where: {receiverUserId: $receiverUserId}, skip: $skip, first: $first) {
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

export const getSqueezedStreamsEventsByUserId = `#graphql
query getSqueezedStreamsEventsByUserId($userId: String!, $skip: Int, $first: Int) {
  squeezedStreamsEvents(where: {userId: $userId}, skip: $skip, first: $first) {
		id
    userId
    assetId
    senderId
    amt
    blockTimestamp
		streamsHistoryHashes
	}
}
`;

const getRepoAccountById = `#graphql
query getRepoAccountById($userId: ID!) {
  repoAccount(id: $userId) {
		id
    name
    forge
    status
    ownerAddress
    lastUpdatedBlockTimestamp
	}
}
`;

const getRepoAccountByNameAndForge = `#graphql
query getRepoAccountByNameAndForge($name: String!, $forge: BigInt!) {
  repoAccounts(where: {name: $name, forge: $forge}) {
		id
    name
    forge
    status
    ownerAddress
    lastUpdatedBlockTimestamp
	}
}
`;

const getRepoAccountsByOwnerAddress = `#graphql
query getRepoAccountsByOwnerAddress($address: String!) {
  repoAccounts(where: {ownerAddress: $address}) {
		id
    name
    forge
    status
    ownerAddress
    lastUpdatedBlockTimestamp
	}
}
`;

export const repoDriverQueries = {
	getRepoAccountById,
	getRepoAccountByNameAndForge,
	getRepoAccountsByOwnerAddress
};
