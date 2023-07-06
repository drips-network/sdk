import type { StreamsSetEvent, StreamsSetEventWithFullReceivers } from './types';

type ReceiversHash = string;

interface StreamReceiverSeenEvent {
	id: string;
	receiverAccountId: string;
	config: bigint;
}

export const sortStreamsSetEvents = <T extends StreamsSetEvent>(streamsSetEvents: T[]): T[] =>
	streamsSetEvents.sort((a, b) => Number(a.blockTimestamp) - Number(b.blockTimestamp));

export const deduplicateArray = <T>(array: T[], key: keyof T): T[] => [
	...new Map(array.map((item) => [item[key], item])).values()
];

export const reconcileDripsSetReceivers = (streamsSetEvents: StreamsSetEvent[]): StreamsSetEventWithFullReceivers[] => {
	const sortedStreamsSetEvents = sortStreamsSetEvents(streamsSetEvents);

	const receiversHashes = sortedStreamsSetEvents.reduce<ReceiversHash[]>((acc, streamsSetEvent) => {
		const { receiversHash } = streamsSetEvent;

		return !acc.includes(receiversHash) ? [...acc, receiversHash] : acc;
	}, []);

	const streamReceiverSeenEventsByReceiversHash = receiversHashes.reduce<{
		[receiversHash: string]: StreamReceiverSeenEvent[];
	}>((acc, receiversHash) => {
		const receivers = deduplicateArray(
			sortedStreamsSetEvents
				.filter((event) => event.receiversHash === receiversHash)
				.reduce<StreamReceiverSeenEvent[]>((accc, event) => [...accc, ...event.streamReceiverSeenEvents], []),
			'config'
		);

		return {
			...acc,
			[receiversHash]: receivers
		};
	}, {});

	return sortedStreamsSetEvents.reduce<StreamsSetEventWithFullReceivers[]>(
		(acc, streamsSetEvent) => [
			...acc,
			{
				...streamsSetEvent,
				currentReceivers: streamReceiverSeenEventsByReceiversHash[streamsSetEvent.receiversHash] ?? []
			}
		],
		[]
	);
};
