import {GetCurrentStreamsQuery} from '../donations/__generated__/gql.generated';
import {ContinuousDonation} from '../donations/prepareContinuousDonation';
import {encodeStreamConfig} from '../shared/streamConfigUtils';
import encodeStreamId from '../shared/streamIdUtils';
import {addressDriverAccountMetadataParser} from './schemas';
import {resolveAddressFromAccountId} from '../shared/resolveAddressFromAccountId';
import {resolveReceiverAccountId} from '../shared/receiverUtils';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {resolveDriverName} from '../shared/resolveDriverName';

export async function buildStreamsMetadata(
  adapter: ReadBlockchainAdapter,
  accountId: bigint,
  streams: GetCurrentStreamsQuery['userById']['chainData'][number]['streams']['outgoing'],
  newStream?: ContinuousDonation & {dripId: bigint},
) {
  const streamsByTokenAddress = streams.reduce<
    Record<
      string,
      GetCurrentStreamsQuery['userById']['chainData'][number]['streams']['outgoing'][number][]
    >
  >(
    (acc, stream) => ({
      ...acc,
      [stream.config.amountPerSecond.tokenAddress.toLowerCase()]: [
        ...(acc[stream.config.amountPerSecond.tokenAddress.toLowerCase()] ??
          []),
        stream,
      ],
    }),
    {},
  );

  const newStreamsByTokenAddress = newStream
    ? {
        ...streamsByTokenAddress,
        [newStream.erc20.toLowerCase()]: [
          ...(streamsByTokenAddress[newStream.erc20.toLowerCase()] ?? []),
          {
            id: encodeStreamId(
              accountId.toString(),
              newStream.erc20,
              newStream.dripId.toString(),
            ),
            name: newStream.name,
            config: {
              raw: encodeStreamConfig({
                streamId: newStream.dripId,
                start: BigInt(newStream.startAt?.getTime() ?? 0) / 1000n,
                duration: BigInt(newStream.durationSeconds ?? 0),
                amountPerSec: newStream.amountPerSec,
              }).toString(),
              dripId: newStream.dripId.toString(),
              amountPerSecond: {
                amount: newStream.amountPerSec.toString(),
              },
              durationSeconds: newStream.durationSeconds,
              startDate:
                newStream.startAt?.toISOString() ?? new Date().toISOString(),
            },
            receiver: {
              account: {
                accountId: await resolveReceiverAccountId(
                  adapter,
                  newStream.receiver,
                ),
              },
            },
          },
        ],
      }
    : streamsByTokenAddress;

  // Parsing with the latest parser version to ensure we never write any invalid metadata.
  return addressDriverAccountMetadataParser.parseLatest({
    describes: {
      driver: 'address',
      accountId: accountId.toString(),
    },
    assetConfigs: Object.entries(newStreamsByTokenAddress).map(
      ([tokenAddress, streams]) => {
        return {
          tokenAddress,
          streams: streams.map(stream => {
            const recipientDriver = resolveDriverName(
              BigInt(stream.receiver.account.accountId),
            );

            let supportedDriver: 'address' | 'nft' | 'repo';

            if (['address', 'nft', 'repo'].includes(recipientDriver)) {
              supportedDriver = recipientDriver as 'address' | 'nft' | 'repo';
            } else {
              throw new Error(
                `Unsupported recipient driver: ${recipientDriver}`,
              );
            }

            return {
              id: stream.id,
              initialDripsConfig: {
                raw: stream.config.raw,
                dripId: stream.config.dripId,
                amountPerSecond: BigInt(stream.config.amountPerSecond.amount),
                durationSeconds: stream.config.durationSeconds || 0,
                startTimestamp: Math.floor(
                  new Date(stream.config.startDate).getTime() / 1000,
                ),
              },
              receiver: {
                driver: supportedDriver,
                accountId: stream.receiver.account.accountId.toString(),
              },
              archived: false,
              name: stream.name ?? undefined,
            };
          }),
        };
      },
    ),
    timestamp: Math.floor(new Date().getTime() / 1000),
    writtenByAddress: resolveAddressFromAccountId(accountId),
  });
}
