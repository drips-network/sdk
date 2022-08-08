// eslint-disable-next-line import/prefer-default-export
export const getUserAssetConfigs = `#graphql
query getUserAssetConfigs($userId: ID!) {
  user(id: $userId) {
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

// export const project = `#graphql
//   query ($id: ID!) {
//     fundingProject (id: $id) {
//       id
//       projectOwner
//       daiCollected
//       daiSplit
//       ipfsHash
//       tokenTypes {
//         tokenTypeId
//         id
//         minAmt: minAmtPerSec
//         limit
//         currentTotalAmtPerSec
//         currentTotalGiven
//         ipfsHash
//         streaming
//       }
//       tokens {
//         owner: tokenReceiver
//         giveAmt
//         amtPerSec
//       }
//     }
//   }
// `;

// export const projectMeta = `#graphql
//   query ($id: ID!) {
//     fundingProject (id: $id) {
//       ipfsHash
//     }
//   }
// `;

// export const dripsConfigByID = `#graphql
//   query ($id: ID!) {
//     dripsConfigs (where: {id: $id}, first: 1) {
//       id
//       balance
//       timestamp: lastUpdatedBlockTimestamp
//       receivers: dripsEntries {
//         receiver
//         amtPerSec
//       }
//     }
//   }
// `;

// export const dripsByReceiver = `#graphql
//   query ($receiver: Bytes!) {
//     dripsEntries (where: { receiver: $receiver} ) {
//       # id
//       sender: user
//       receiver
//       amtPerSec
//     }
//   }
// `;

// export const splitsBySender = `#graphql
//   query ($sender: Bytes!, $first: Int!) {
//     splitsEntries (first: $first, where: { sender: $sender }) {
//       # id
//       sender
//       receiver
//       weight
//     }
//   }
// `;

// export const splitsByReceiver = `#graphql
//   query ($receiver: Bytes!, $first: Int!) {
//     splitsEntries (first: $first, where: { receiver: $receiver }) {
//       # id
//       sender
//       receiver
//       weight
//     }
//   }
// `;
