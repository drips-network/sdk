export const getAccountAssetConfigById = `#graphql
query getAccountAssetConfigById($configId: ID!) {
	accountAssetConfig(id: $configId) {
		id
		assetId
		streamsEntries {
			id
			accountId
			config
		}
		balance
		amountCollected
		lastUpdatedBlockTimestamp
	}
}
`;

export const getAllAccountAssetConfigsByAccountId = `#graphql
query getAllAccountAssetConfigsByAccountId($accountId: ID!, $skip: Int, $first: Int) {
  account(id: $accountId) {
    assetConfigs(skip: $skip, first: $first) {
      id
			assetId
			streamsEntries {
				id
				accountId
				config
			}
			balance
			amountCollected
			lastUpdatedBlockTimestamp
    }
  }
}
`;

export const getSplitsConfigByAccountId = `#graphql
query getSplitsConfigByAccountId($accountId: ID!, $skip: Int, $first: Int) {
  account(id: $accountId) {
		splitsEntries(skip: $skip, first: $first) {
			id
    	sender {
      	id
    	}
    	accountId
    	weight
		}
  }
}
`;

export const getSplitEntriesByReceiverAccountId = `#graphql
query getSplitEntriesByReceiverAccountId($receiverAccountId: String!, $skip: Int, $first: Int) {
  splitsEntries(where: {accountId: $receiverAccountId}, skip: $skip, first: $first) {
    id
    sender {
      id
    }
    accountId
    weight
  }
}
`;

export const getStreamsSetEventsByAccountId = `#graphql
query getStreamsSetEventsByAccountId($accountId: String!, $skip: Int, $first: Int) {
  streamsSetEvents(where: {accountId: $accountId}, skip: $skip, first: $first) {
		id
    accountId
    assetId
		receiversHash
    streamReceiverSeenEvents {
			id
      receiverAccountId
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
query getStreamReceiverSeenEventsByReceiverId($receiverAccountId: String!, $skip: Int, $first: Int) {
  streamReceiverSeenEvents(where: {receiverAccountId: $receiverAccountId}, skip: $skip, first: $first) {
		id
    config
		receiverAccountId
		senderAccountId
		streamsSetEvent {
			id
			accountId
			assetId
			receiversHash
		}
    blockTimestamp
  }
}
`;

export const getMetadataHistoryByUser = `#graphql
query getMetadataHistoryByUser($accountId: String!,$skip: Int, $first: Int) {
  accountMetadataEvents(where: {accountId: $accountId}, skip: $skip, first: $first) {
		id
    key
    value
    accountId
    lastUpdatedBlockTimestamp
  }
}
`;

export const getMetadataHistoryByUserAndKey = `#graphql
query getMetadataHistoryByUserAndKey($accountId: String!, $key: Bytes!, $skip: Int, $first: Int) {
  accountMetadataEvents(where: {accountId: $accountId, key: $key}, skip: $skip, first: $first) {
		id
    key
    value
    accountId
    lastUpdatedBlockTimestamp
  }
}
`;

export const getMetadataHistoryByKeyAndValue = `#graphql
query getMetadataHistoryByKeyAndValue($key: Bytes!, $value: Bytes!, $skip: Int, $first: Int) {
  accountMetadataEvents(where: {key: $key, value: $value}, skip: $skip, first: $first) {
		id
    key
    value
    accountId
    lastUpdatedBlockTimestamp
  }
}
`;

export const getNftSubAccountsByOwner = `#graphql
query getNftSubAccountsByOwner($ownerAddress: Bytes!, $skip: Int, $first: Int) {
	nftsubAccounts(where: {ownerAddress: $ownerAddress}, skip: $skip, first: $first) {
		id
		ownerAddress
		originalOwnerAddress
	}
}
`;

export const getNftSubAccountOwnerByTokenId = `#graphql
query getNftSubAccountOwnerByTokenId($tokenId: ID!) {
	nftsubAccount(id: $tokenId) {
		id
		ownerAddress
		originalOwnerAddress
	}
}
`;

export const getCollectedEventsByAccountId = `#graphql
query getCollectedEventsByAccountId($accountId: String!, $skip: Int, $first: Int) {
  collectedEvents(where: {account: $accountId}, skip: $skip, first: $first) {
		id
		account {
			id
		}
		assetId
		collected
		blockTimestamp
	}
}
`;

export const getSplitEventsByAccountId = `#graphql
query getSplitEventsByAccountId($accountId: String!, $skip: Int, $first: Int) {
  splitEvents(where: {accountId: $accountId}, skip: $skip, first: $first) {
		id
		accountId
		receiverId
		assetId
		amt
		blockTimestamp
	}
}
`;

export const getSplitEventsByReceiverAccountId = `#graphql
query getSplitEventsByReceiverAccountId($receiverAccountId: String!, $skip: Int, $first: Int) {
  splitEvents(where: {receiverId: $receiverAccountId}, skip: $skip, first: $first) {
		id
		accountId
		receiverId
		assetId
		amt
		blockTimestamp
	}
}
`;

export const getReceivedStreamsEventsByAccountId = `#graphql
query getReceivedStreamsEventsByAccountId($accountId: String!, $skip: Int, $first: Int) {
  receivedStreamsEvents(where: {accountId: $accountId}, skip: $skip, first: $first) {
		id
		accountId
		receivableCycles
		assetId
		amt
		blockTimestamp
	}
}
`;

export const getGivenEventsByAccountId = `#graphql
query getGivenEventsByAccountId($accountId: String!, $skip: Int, $first: Int) {
  givenEvents(where: {accountId: $accountId}, skip: $skip, first: $first) {
		id
		accountId
		receiverAccountId
		assetId
		amt
		blockTimestamp
	}
}
`;

export const getGivenEventsByReceiverAccountId = `#graphql
query getGivenEventsByReceiverAccountId($receiverAccountId: String!, $skip: Int, $first: Int) {
  givenEvents(where: {receiverAccountId: $receiverAccountId}, skip: $skip, first: $first) {
		id
		accountId
		receiverAccountId
		assetId
		amt
		blockTimestamp
	}
}
`;

export const getLatestAccountMetadata = `#graphql
query getLatestAccountMetadata($id: ID!) {
  accountMetadataByKey(id: $id) {
		id
    key
    value
    accountId
		lastUpdatedBlockTimestamp
  }
}
`;

export const getSqueezedStreamsEventsByAccountId = `#graphql
query getSqueezedStreamsEventsByAccountId($accountId: String!, $skip: Int, $first: Int) {
  squeezedStreamsEvents(where: {accountId: $accountId}, skip: $skip, first: $first) {
		id
    accountId
    assetId
    senderId
    amt
    blockTimestamp
		streamsHistoryHashes
	}
}
`;

const getRepoAccountById = `#graphql
query getRepoAccountById($accountId: ID!) {
  repoAccount(id: $accountId) {
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
