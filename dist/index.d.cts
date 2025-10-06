import { Abi, ContractFunctionName, EncodeFunctionDataParameters, Address, Hash, Hex, PublicClient, WalletClient, Account } from 'viem';
import { B as BatchedTxOverrides, P as PreparedTx, R as ReadBlockchainAdapter, W as WriteBlockchainAdapter, T as TxResponse } from './BlockchainAdapter-Dt3QuYIj.cjs';
export { a as TxReceipt } from './BlockchainAdapter-Dt3QuYIj.cjs';
import * as _efstajas_versioned_parser from '@efstajas/versioned-parser';
import * as z from 'zod';
import z__default, { z as z$1 } from 'zod';

declare function buildTx<AbiType extends Abi | readonly unknown[], FnName extends ContractFunctionName<AbiType> | undefined = undefined>(request: EncodeFunctionDataParameters<AbiType, FnName> & {
    contract: Address;
    batchedTxOverrides?: BatchedTxOverrides;
}): PreparedTx;

/** Stream rate time units. */
declare enum TimeUnit {
    SECOND = 1,
    MINUTE = 60,
    HOUR = 3600,
    DAY = 86400,
    WEEK = 604800,
    /** 30 Days */
    MONTH = 2592000,
    /** 365 Days */
    YEAR = 31536000
}
/** Represents the configuration of a single stream. */
type StreamConfig = {
    /** The unique identifier for the stream. */
    dripId: bigint;
    /**
     * The amount per second being streamed. Must never be zero.
     *
     * It must have additional `AMT_PER_SEC_EXTRA_DECIMALS` decimals and can have fractions.
     *
     * To achieve that the passed value must be multiplied by `AMT_PER_SEC_MULTIPLIER`.
     */
    amountPerSec: bigint;
    /**
     * The timestamp when streaming should start.
     *
     * If zero, the timestamp when the stream is configured is used.
     */
    start: bigint;
    /**
     * The duration of the stream in seconds.
     *
     * If zero, the stream runs until funds run out.
     */
    duration: bigint;
};
declare function encodeStreamConfig(config: StreamConfig): bigint;
declare function decodeStreamConfig(packed: bigint): StreamConfig;

declare function resolveAddressFromAddressDriverId(accountId: bigint): Address;

declare function resolveDriverName(accountId: bigint): "address" | "nft" | "immutableSplits" | "repo" | "repoSubAccount";

declare function calcDripListId(adapter: ReadBlockchainAdapter, params: {
    salt: bigint;
    minter: Address;
}): Promise<bigint>;

declare function calcAddressId(adapter: ReadBlockchainAdapter, address: Address): Promise<bigint>;

declare const supportedForges: readonly ["github", "orcid"];
/**
 * Supported forges.
 */
type Forge$1 = (typeof supportedForges)[number];
/**
 * Project name in the format 'owner/repository'.
 */
type ProjectName = `${string}/${string}`;
/**
 * ORCID iD in the format ^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$
 */
type OrcidId = string;
declare function calcOrcidAccountId(adapter: ReadBlockchainAdapter, orcidId: OrcidId): Promise<bigint>;
declare function calcProjectId(adapter: ReadBlockchainAdapter, params: {
    forge: Forge$1;
    name: ProjectName | OrcidId;
}): Promise<bigint>;

declare const nftDriverAccountMetadataParser: _efstajas_versioned_parser.Parser<[(data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    type: "ecosystem";
    driver: "nft";
    describes: {
        driver: "nft";
        accountId: string;
    };
    color: string;
    recipients: ({
        type: "repoSubAccountDriver";
        accountId: string;
        weight: number;
        source: {
            forge: "github";
            repoName: string;
            ownerName: string;
            url: string;
        };
    } | {
        type: "subList";
        accountId: string;
        weight: number;
    })[];
    isVisible: boolean;
    avatar: {
        type: "emoji";
        emoji: string;
    };
    name?: string | undefined;
    description?: string | undefined;
    isDripList?: undefined;
    projects?: undefined;
    latestVotingRoundId?: string | undefined;
} | {
    type: "dripList";
    driver: "nft";
    describes: {
        driver: "nft";
        accountId: string;
    };
    recipients: ({
        type: "address";
        accountId: string;
        weight: number;
    } | {
        type: "repoDriver";
        accountId: string;
        weight: number;
        source: {
            forge: "github";
            repoName: string;
            ownerName: string;
            url: string;
        };
    } | {
        type: "dripList";
        accountId: string;
        weight: number;
    } | {
        type: "subList";
        accountId: string;
        weight: number;
    } | {
        type: "orcid";
        accountId: string;
        weight: number;
        orcidId: string;
    })[];
    isVisible: boolean;
    name?: string | undefined;
    description?: string | undefined;
    isDripList?: undefined;
    projects?: undefined;
    latestVotingRoundId?: string | undefined;
}, (data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    type: "ecosystem";
    driver: "nft";
    describes: {
        driver: "nft";
        accountId: string;
    };
    color: string;
    recipients: ({
        type: "repoSubAccountDriver";
        accountId: string;
        weight: number;
        source: {
            forge: "github";
            repoName: string;
            ownerName: string;
            url: string;
        };
    } | {
        type: "subList";
        accountId: string;
        weight: number;
    })[];
    isVisible: boolean;
    avatar: {
        type: "emoji";
        emoji: string;
    };
    name?: string | undefined;
    description?: string | undefined;
    isDripList?: undefined;
    projects?: undefined;
    latestVotingRoundId?: string | undefined;
} | {
    type: "dripList";
    driver: "nft";
    describes: {
        driver: "nft";
        accountId: string;
    };
    recipients: ({
        type: "address";
        accountId: string;
        weight: number;
    } | {
        type: "repoDriver";
        accountId: string;
        weight: number;
        source: {
            forge: "github";
            repoName: string;
            ownerName: string;
            url: string;
        };
    } | {
        type: "dripList";
        accountId: string;
        weight: number;
    } | {
        type: "subList";
        accountId: string;
        weight: number;
    })[];
    isVisible: boolean;
    name?: string | undefined;
    description?: string | undefined;
    isDripList?: undefined;
    projects?: undefined;
    latestVotingRoundId?: string | undefined;
}, (data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    driver: "nft";
    describes: {
        driver: "nft";
        accountId: string;
    };
    isDripList: true;
    projects: ({
        type: "address";
        accountId: string;
        weight: number;
    } | {
        type: "repoDriver";
        accountId: string;
        weight: number;
        source: {
            forge: "github";
            repoName: string;
            ownerName: string;
            url: string;
        };
    } | {
        type: "dripList";
        accountId: string;
        weight: number;
    })[];
    isVisible: boolean;
    name?: string | undefined;
    description?: string | undefined;
    latestVotingRoundId?: string | undefined;
}, (data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    driver: "nft";
    describes: {
        driver: "nft";
        accountId: string;
    };
    isDripList: true;
    projects: ({
        type: "address";
        accountId: string;
        weight: number;
    } | {
        type: "repoDriver";
        accountId: string;
        weight: number;
        source: {
            forge: "github";
            repoName: string;
            ownerName: string;
            url: string;
        };
    } | {
        type: "dripList";
        accountId: string;
        weight: number;
    })[];
    name?: string | undefined;
    description?: string | undefined;
    latestVotingRoundId?: string | undefined;
}, (data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    driver: "nft";
    describes: {
        driver: "nft";
        accountId: string;
    };
    isDripList: true;
    projects: ({
        type: "address";
        accountId: string;
        weight: number;
    } | {
        type: "repoDriver";
        accountId: string;
        weight: number;
        source: {
            forge: "github";
            repoName: string;
            ownerName: string;
            url: string;
        };
    } | {
        type: "dripList";
        accountId: string;
        weight: number;
    })[];
    name?: string | undefined;
    description?: string | undefined;
}, (data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    driver: "nft";
    describes: {
        driver: "nft";
        accountId: string;
    };
    isDripList: true;
    projects: ({
        type: "address";
        accountId: string;
        weight: number;
    } | {
        type: "repoDriver";
        accountId: string;
        weight: number;
        source: {
            forge: "github";
            repoName: string;
            ownerName: string;
            url: string;
        };
    } | {
        type: "dripList";
        accountId: string;
        weight: number;
    })[];
    name?: string | undefined;
}, (data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    driver: "nft";
    describes: {
        driver: "nft";
        accountId: string;
    };
    isDripList: true;
    projects: ({
        accountId: string;
        weight: number;
    } | {
        accountId: string;
        weight: number;
        source: {
            forge: "github";
            repoName: string;
            ownerName: string;
            url: string;
        };
    })[];
    name?: string | undefined;
}]>;
declare const repoDriverAccountMetadataParser: _efstajas_versioned_parser.Parser<[(data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    driver: "repo";
    describes: {
        driver: "repo";
        accountId: string;
    };
    source: {
        forge: "github";
        repoName: string;
        ownerName: string;
        url: string;
    };
    color: string;
    splits: {
        maintainers: {
            type: "address";
            accountId: string;
            weight: number;
        }[];
        dependencies: ({
            type: "address";
            accountId: string;
            weight: number;
        } | {
            type: "repoDriver";
            accountId: string;
            weight: number;
            source: {
                forge: "github";
                repoName: string;
                ownerName: string;
                url: string;
            };
        } | {
            type: "dripList";
            accountId: string;
            weight: number;
        })[];
    };
    isVisible: boolean;
    avatar: {
        type: "emoji";
        emoji: string;
    } | {
        type: "image";
        cid: string;
    };
    description?: string | undefined;
    emoji?: undefined;
}, (data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    driver: "repo";
    describes: {
        driver: "repo";
        accountId: string;
    };
    source: {
        forge: "github";
        repoName: string;
        ownerName: string;
        url: string;
    };
    color: string;
    splits: {
        maintainers: {
            type: "address";
            accountId: string;
            weight: number;
        }[];
        dependencies: ({
            type: "address";
            accountId: string;
            weight: number;
        } | {
            type: "repoDriver";
            accountId: string;
            weight: number;
            source: {
                forge: "github";
                repoName: string;
                ownerName: string;
                url: string;
            };
        } | {
            type: "dripList";
            accountId: string;
            weight: number;
        })[];
    };
    avatar: {
        type: "emoji";
        emoji: string;
    } | {
        type: "image";
        cid: string;
    };
    description?: string | undefined;
    emoji?: undefined;
}, (data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    driver: "repo";
    describes: {
        driver: "repo";
        accountId: string;
    };
    emoji: string;
    source: {
        forge: "github";
        repoName: string;
        ownerName: string;
        url: string;
    };
    color: string;
    splits: {
        maintainers: {
            type: "address";
            accountId: string;
            weight: number;
        }[];
        dependencies: ({
            type: "address";
            accountId: string;
            weight: number;
        } | {
            type: "repoDriver";
            accountId: string;
            weight: number;
            source: {
                forge: "github";
                repoName: string;
                ownerName: string;
                url: string;
            };
        } | {
            type: "dripList";
            accountId: string;
            weight: number;
        })[];
    };
    description?: string | undefined;
}, (data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    driver: "repo";
    describes: {
        driver: "repo";
        accountId: string;
    };
    emoji: string;
    source: {
        forge: "github";
        repoName: string;
        ownerName: string;
        url: string;
    };
    color: string;
    splits: {
        maintainers: {
            type: "address";
            accountId: string;
            weight: number;
        }[];
        dependencies: ({
            type: "address";
            accountId: string;
            weight: number;
        } | {
            type: "repoDriver";
            accountId: string;
            weight: number;
            source: {
                forge: "github";
                repoName: string;
                ownerName: string;
                url: string;
            };
        })[];
    };
    description?: string | undefined;
}, (data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    driver: "repo";
    describes: {
        driver: "repo";
        accountId: string;
    };
    emoji: string;
    source: {
        forge: "github";
        repoName: string;
        ownerName: string;
        url: string;
    };
    color: string;
    splits: {
        maintainers: {
            accountId: string;
            weight: number;
        }[];
        dependencies: ({
            accountId: string;
            weight: number;
        } | {
            accountId: string;
            weight: number;
            source: {
                forge: "github";
                repoName: string;
                ownerName: string;
                url: string;
            };
        })[];
    };
    description?: string | undefined;
}]>;
declare const immutableSplitsDriverMetadataParser: _efstajas_versioned_parser.Parser<[(data: unknown, params?: z.util.InexactPartial<z.ParseParams>) => {
    type: "subList";
    driver: "immutable-splits";
    recipients: ({
        type: "address";
        accountId: string;
        weight: number;
    } | {
        type: "dripList";
        accountId: string;
        weight: number;
    } | {
        type: "repoSubAccountDriver";
        accountId: string;
        weight: number;
        source: {
            forge: "github";
            repoName: string;
            ownerName: string;
            url: string;
        };
    } | {
        type: "subList";
        accountId: string;
        weight: number;
    })[];
    parent: {
        type: "dripList" | "subList" | "ecosystem";
        driver: "nft" | "immutable-splits";
        accountId: string;
    };
    root: {
        type: "dripList" | "subList" | "ecosystem";
        driver: "nft" | "immutable-splits";
        accountId: string;
    };
}]>;

interface DripsGraphQLClient {
    query<T, V extends object = Record<string, any>>(query: string, variables?: V): Promise<T>;
}

declare const subListSplitReceiverSchema: z__default.ZodObject<{
    type: z__default.ZodLiteral<"subList">;
    weight: z__default.ZodNumber;
    accountId: z__default.ZodString;
}, "strip", z__default.ZodTypeAny, {
    type: "subList";
    accountId: string;
    weight: number;
}, {
    type: "subList";
    accountId: string;
    weight: number;
}>;

/**
 * A splits entry that splits directly to a different Drip List.
 */
declare const dripListSplitReceiverSchema: z$1.ZodObject<{
    type: z$1.ZodLiteral<"dripList">;
    weight: z$1.ZodNumber;
    accountId: z$1.ZodString;
}, "strip", z$1.ZodTypeAny, {
    type: "dripList";
    accountId: string;
    weight: number;
}, {
    type: "dripList";
    accountId: string;
    weight: number;
}>;

declare const addressDriverSplitReceiverSchema: z$1.ZodObject<{
    type: z$1.ZodLiteral<"address">;
    weight: z$1.ZodNumber;
    accountId: z$1.ZodString;
}, "strip", z$1.ZodTypeAny, {
    type: "address";
    accountId: string;
    weight: number;
}, {
    type: "address";
    accountId: string;
    weight: number;
}>;
declare const repoDriverSplitReceiverSchema: z$1.ZodObject<{
    type: z$1.ZodLiteral<"repoDriver">;
    weight: z$1.ZodNumber;
    accountId: z$1.ZodString;
    source: z$1.ZodObject<{
        forge: z$1.ZodLiteral<"github">;
        repoName: z$1.ZodString;
        ownerName: z$1.ZodString;
        url: z$1.ZodString;
    }, "strip", z$1.ZodTypeAny, {
        forge: "github";
        repoName: string;
        ownerName: string;
        url: string;
    }, {
        forge: "github";
        repoName: string;
        ownerName: string;
        url: string;
    }>;
}, "strip", z$1.ZodTypeAny, {
    type: "repoDriver";
    accountId: string;
    weight: number;
    source: {
        forge: "github";
        repoName: string;
        ownerName: string;
        url: string;
    };
}, {
    type: "repoDriver";
    accountId: string;
    weight: number;
    source: {
        forge: "github";
        repoName: string;
        ownerName: string;
        url: string;
    };
}>;

declare enum Driver {
    Address = "ADDRESS",
    ImmutableSplits = "IMMUTABLE_SPLITS",
    Nft = "NFT",
    Repo = "REPO"
}
declare enum Forge {
    GitHub = "GitHub",
    GitLab = "GitLab"
}
declare enum SupportedChain {
    BaseSepolia = "BASE_SEPOLIA",
    Filecoin = "FILECOIN",
    Localtestnet = "LOCALTESTNET",
    Mainnet = "MAINNET",
    Metis = "METIS",
    Optimism = "OPTIMISM",
    OptimismSepolia = "OPTIMISM_SEPOLIA",
    PolygonAmoy = "POLYGON_AMOY",
    Sepolia = "SEPOLIA",
    ZksyncEraSepolia = "ZKSYNC_ERA_SEPOLIA"
}

type GetDripListQuery = {
    __typename: 'Query';
    dripList?: {
        __typename: 'DripList';
        chain: SupportedChain;
        description?: string | null;
        isVisible: boolean;
        lastProcessedIpfsHash?: string | null;
        latestMetadataIpfsHash?: string | null;
        latestVotingRoundId?: string | null;
        name: string;
        previousOwnerAddress: string;
        account: {
            __typename: 'NftDriverAccount';
            accountId: string;
            driver: Driver;
        };
        owner: {
            __typename: 'AddressDriverAccount';
            accountId: string;
            driver: Driver;
            address: string;
        };
        splits: Array<{
            __typename: 'AddressReceiver';
            weight: number;
            account: {
                __typename: 'AddressDriverAccount';
                accountId: string;
                address: string;
                driver: Driver;
            };
        } | {
            __typename: 'DripListReceiver';
            weight: number;
            account: {
                __typename: 'NftDriverAccount';
                accountId: string;
                driver: Driver;
            };
        } | {
            __typename: 'EcosystemMainAccountReceiver';
            weight: number;
            account: {
                __typename: 'NftDriverAccount';
                accountId: string;
                driver: Driver;
            };
        } | {
            __typename: 'LinkedIdentityReceiver';
            weight: number;
            account: {
                __typename: 'RepoDriverAccount';
                accountId: string;
                driver: Driver;
            };
        } | {
            __typename: 'ProjectReceiver';
            weight: number;
            account: {
                __typename: 'RepoDriverAccount';
                accountId: string;
                driver: Driver;
            };
            project: {
                __typename: 'Project';
                source: {
                    __typename: 'Source';
                    forge: Forge;
                    ownerName: string;
                    repoName: string;
                    url: string;
                };
            };
        } | {
            __typename: 'SubListReceiver';
            weight: number;
            account: {
                __typename: 'ImmutableSplitsDriverAccount';
                accountId: string;
                driver: Driver;
            };
        }>;
        support: Array<{
            __typename: 'DripListSupport';
        } | {
            __typename: 'EcosystemSupport';
        } | {
            __typename: 'OneTimeDonationSupport';
            date: any;
            account: {
                __typename: 'AddressDriverAccount';
                accountId: string;
                address: string;
                driver: Driver;
            };
            amount: {
                __typename: 'Amount';
                amount: string;
                tokenAddress: string;
            };
        } | {
            __typename: 'ProjectSupport';
        } | {
            __typename: 'StreamSupport';
            account: {
                __typename: 'AddressDriverAccount';
                accountId: string;
                address: string;
                driver: Driver;
            };
            stream: {
                __typename: 'Stream';
                id: string;
                name?: string | null;
                config: {
                    __typename: 'StreamConfig';
                    dripId: string;
                    durationSeconds?: number | null;
                    raw: string;
                    startDate?: any | null;
                    amountPerSecond: {
                        __typename: 'Amount';
                        amount: string;
                        tokenAddress: string;
                    };
                };
            };
        }>;
    } | null;
};

type DripList = NonNullable<GetDripListQuery['dripList']>;
declare function getDripListById(id: bigint, chainId: number, graphqlClient?: DripsGraphQLClient): Promise<DripList | null>;

declare const orcidSplitReceiverSchema: z__default.ZodObject<{
    type: z__default.ZodLiteral<"orcid">;
    weight: z__default.ZodNumber;
    accountId: z__default.ZodString;
    orcidId: z__default.ZodString;
}, "strip", z__default.ZodTypeAny, {
    type: "orcid";
    accountId: string;
    weight: number;
    orcidId: string;
}, {
    type: "orcid";
    accountId: string;
    weight: number;
    orcidId: string;
}>;

type SdkProjectReceiver = {
    type: 'project';
    url: string;
};
type SdkDripListReceiver = {
    type: 'drip-list';
    accountId: bigint;
};
type SdkEcosystemMainAccountReceiver = {
    type: 'ecosystem-main-account';
    accountId: bigint;
};
type SdkSubListReceiver = {
    type: 'sub-list';
    accountId: bigint;
};
type SdkAddressReceiver = {
    type: 'address';
    address: Address;
};
type SdkOrcidReceiver = {
    type: 'orcid';
    orcidId: string;
};
type SdkReceiver = SdkProjectReceiver | SdkDripListReceiver | SdkSubListReceiver | SdkAddressReceiver | SdkEcosystemMainAccountReceiver | SdkOrcidReceiver;
type SdkSplitsReceiver = SdkReceiver & {
    weight: number;
};
type OnChainSplitsReceiver = {
    accountId: bigint;
    weight: number;
};
type MetadataDripListReceiver = z__default.output<typeof dripListSplitReceiverSchema>;
type MetadataProjectReceiver = z__default.output<typeof repoDriverSplitReceiverSchema>;
type MetadataAddressReceiver = z__default.output<typeof addressDriverSplitReceiverSchema>;
type SubListMetadataReceiver = z__default.output<typeof subListSplitReceiverSchema>;
type MetadataOrcidReceiver = z__default.output<typeof orcidSplitReceiverSchema>;
type MetadataSplitsReceiver = MetadataProjectReceiver | MetadataDripListReceiver | MetadataAddressReceiver | SubListMetadataReceiver | MetadataOrcidReceiver;

type ContinuousDonation = {
    /** The ERC20 token address to stream. */
    readonly erc20: Address;
    /** The amount of tokens to stream in the specified `timeUnit` (e.g. "100"). */
    readonly amount: string;
    /** The time unit for the `amount` (e.g. TimeUnit.DAY for daily streaming). */
    readonly timeUnit: TimeUnit;
    /** The number of decimal places for the token (e.g. 18 for ETH, 6 for USDC). */
    readonly tokenDecimals: number;
    /** The receiver of the stream. */
    readonly receiver: SdkReceiver;
    /** Optional name for the donation stream. */
    readonly name?: string;
    /** Optional start time for the stream. Defaults to "now". */
    readonly startAt?: Date;
    /** Optional stream duration in seconds. If omitted, stream runs until funds run out. */
    readonly durationSeconds?: bigint;
    /** Optional amount of tokens to top up when setting the stream. */
    readonly topUpAmount?: string;
    /** Optional transaction overrides for the returned `PreparedTx`. */
    batchedTxOverrides?: BatchedTxOverrides;
};
type PrepareContinuousDonationResult = {
    readonly ipfsHash: string;
    readonly preparedTx: PreparedTx;
    readonly metadata: StreamsMetadata;
};
declare function prepareContinuousDonation(adapter: WriteBlockchainAdapter, ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<StreamsMetadata>, donation: ContinuousDonation, graphqlClient?: DripsGraphQLClient): Promise<PrepareContinuousDonationResult>;

type GetCurrentStreamsQuery = {
    __typename: 'Query';
    userById: {
        __typename: 'User';
        chainData: Array<{
            __typename: 'UserData';
            chain: SupportedChain;
            streams: {
                __typename: 'UserStreams';
                outgoing: Array<{
                    __typename: 'Stream';
                    id: string;
                    name?: string | null;
                    isPaused: boolean;
                    config: {
                        __typename: 'StreamConfig';
                        raw: string;
                        dripId: string;
                        durationSeconds?: number | null;
                        startDate?: any | null;
                        amountPerSecond: {
                            __typename: 'Amount';
                            tokenAddress: string;
                            amount: string;
                        };
                    };
                    receiver: {
                        __typename: 'DripList';
                        account: {
                            __typename: 'NftDriverAccount';
                            accountId: string;
                        };
                    } | {
                        __typename: 'EcosystemMainAccount';
                        account: {
                            __typename: 'NftDriverAccount';
                            accountId: string;
                        };
                    } | {
                        __typename: 'User';
                        account: {
                            __typename: 'AddressDriverAccount';
                            accountId: string;
                        };
                    };
                }>;
            };
        }>;
    };
};

declare function buildStreamsMetadata(adapter: ReadBlockchainAdapter, accountId: bigint, streams: GetCurrentStreamsQuery['userById']['chainData'][number]['streams']['outgoing'], newStream?: ContinuousDonation & {
    dripId: bigint;
}): Promise<{
    describes: {
        driver: "address";
        accountId: string;
    };
    assetConfigs: {
        tokenAddress: string;
        streams: {
            id: string;
            initialDripsConfig: {
                amountPerSecond: bigint;
                dripId: string;
                raw: string;
                durationSeconds: number;
                startTimestamp?: number | undefined;
            };
            receiver: {
                driver: "address" | "nft" | "repo";
                accountId: string;
            };
            archived: boolean;
            name?: string | undefined;
            description?: string | undefined;
        }[];
    }[];
    timestamp: number;
    writtenByAddress: string;
    name?: string | undefined;
    description?: string | undefined;
    emoji?: string | undefined;
}>;

type DripListMetadata = Extract<ReturnType<typeof nftDriverAccountMetadataParser.parseLatest>, {
    type: 'dripList';
}>;
type ProjectMetadata = ReturnType<typeof repoDriverAccountMetadataParser.parseLatest>;
type SubListMetadata = ReturnType<typeof immutableSplitsDriverMetadataParser.parseLatest>;
type StreamsMetadata = Awaited<ReturnType<typeof buildStreamsMetadata>>;
type Metadata = DripListMetadata | ProjectMetadata | SubListMetadata | StreamsMetadata;
type IpfsMetadataUploaderFn<T extends Metadata> = (metadata: T) => Promise<Hash>;
/**
 * Creates an IPFS metadata uploader function that uses Pinata as infrastructure.
 *
 * @param {Object} options - Configuration options.
 * @param {string} options.pinataJwt - The JWT token for authenticating with Pinata.
 * @param {string} options.pinataGateway - The Pinata gateway URL for uploads.
 *
 * @returns {IpfsMetadataUploaderFn<Metadata>} A function that uploads metadata to IPFS via Pinata.
 */
declare function createPinataIpfsMetadataUploader({ pinataJwt, pinataGateway, }: {
    pinataJwt: string;
    pinataGateway: string;
}): IpfsMetadataUploaderFn<Metadata>;

type NewDripList = {
    /** Indicates whether the Drip List is visible. */
    readonly isVisible: boolean;
    /**
     * The list of receivers.
     *
     * All weights must sum to exactly 1_000_000 (i.e., 100% of the funds to be distributed).
     * An empty list is allowed and means 100% of the funds remain with the account.
     * The list must not contain duplicate receivers.
     */
    readonly receivers: ReadonlyArray<SdkSplitsReceiver>;
    /** Optional salt value for deterministic Drip List ID generation. If not provided, a random salt is used. */
    readonly salt?: bigint;
    /** Optional name for the Drip List. */
    readonly name?: string;
    /** Optional description for the Drip List. */
    readonly description?: string | null;
    /** Optional address to transfer the Drip List to. If not provided, the minter's address will be used. */
    readonly transferTo?: Address;
    /** Optional transaction overrides for the returned `PreparedTx`. */
    readonly batchedTxOverrides?: BatchedTxOverrides;
    /** Optional latest voting round ID for the Drip List. */
    readonly latestVotingRoundId?: string;
};
type PrepareDripListCreationResult = {
    readonly salt: bigint;
    readonly ipfsHash: Hash;
    readonly dripListId: bigint;
    readonly preparedTx: PreparedTx;
    readonly metadata: DripListMetadata;
};
declare function prepareDripListCreation(adapter: WriteBlockchainAdapter, ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>, dripList: NewDripList): Promise<PrepareDripListCreationResult>;

type CreateDripListResult = {
    salt: bigint;
    ipfsHash: Hash;
    dripListId: bigint;
    txResponse: TxResponse;
    metadata: DripListMetadata;
};
declare function createDripList(adapter: WriteBlockchainAdapter, ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>, dripList: NewDripList): Promise<CreateDripListResult>;

type DripListUpdateConfig = {
    /** The ID of the Drip List to update. */
    readonly dripListId: bigint;
    /** Optional metadata updates for the Drip List. */
    readonly metadata?: {
        /** Optional new name for the Drip List. */
        readonly name?: string;
        /** Optional new description for the Drip List. */
        readonly description?: string;
        /** Optional new visibility setting for the Drip List. */
        readonly isVisible?: boolean;
    };
    /** Optional new list of receivers. If provided, replaces the current receivers entirely. */
    readonly receivers?: ReadonlyArray<SdkSplitsReceiver>;
    /** Optional transaction overrides for the batched transaction. */
    readonly batchedTxOverrides?: BatchedTxOverrides;
};
type PrepareDripListUpdateResult = {
    readonly ipfsHash: string;
    readonly preparedTx: PreparedTx;
    readonly metadata: DripListMetadata;
};
declare function prepareDripListUpdate(adapter: WriteBlockchainAdapter, ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>, config: DripListUpdateConfig, graphqlClient?: DripsGraphQLClient): Promise<PrepareDripListUpdateResult>;

type UpdateDripListResult = {
    readonly ipfsHash: string;
    readonly metadata: DripListMetadata;
    readonly txResponse: TxResponse;
};
declare function updateDripList(adapter: WriteBlockchainAdapter, ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>, config: DripListUpdateConfig, graphqlClient?: DripsGraphQLClient): Promise<UpdateDripListResult>;

interface DripListsModule {
    /**
     * Calculates the Drip List ID (token ID) for a given `minter` and `salt`.
     *
     * This allows the caller to precompute the ID of a Drip List before it is actually minted.
     *
     * @param salt - A salt value used to ensure uniqueness in the token ID derivation.
     * @param minter - The address of the account that would mint the Drip List.
     *
     * @returns The Drip List ID.
     *
     * @throws {DripsError} If the chain is not supported.
     */
    calculateId(salt: bigint, minter: Address): Promise<bigint>;
    /**
     * Fetches a `DripList` by its ID and chain ID.
     *
     * @param id - The Drip List ID.
     * @param chainId - The chain ID.
     *
     * @throws {DripsError} If the chain is not supported.
     *
     * @returns The `DripList`, or `null` if not found.
     */
    getById(id: bigint, chainId: number): Promise<DripList | null>;
    /**
     * Prepares the context for creating a new Drip List.
     *
     * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
     * @param dripList - Configuration for the new Drip List.
     *
     * @returns An object containing the prepared transaction, metadata, IPFS hash, salt, and Drip List ID.
     *
     * @throws {DripsError} If the chain is not supported or if validation fails.
     */
    prepareCreate(dripList: NewDripList): Promise<PrepareDripListCreationResult>;
    /**
     * Creates a new Drip List.
     *
     * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
     * @param dripList - Configuration for the new Drip List.
     *
     * @returns An object containing the transaction response, metadata, IPFS hash, salt, and Drip List ID.
     *
     * @throws {DripsError} If the chain is not supported, validation fails, or transaction execution fails.
     */
    create(dripList: NewDripList): Promise<CreateDripListResult>;
    /**
     * Prepares the context for updating a Drip List.
     *
     * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
     * @param config - Configuration specifying what to update in the Drip List.
     *
     * @returns An object containing the prepared transaction, new metadata, and IPFS hash.
     *
     * @throws {DripsError} If the Drip List is not found, chain is not supported, or no updates are provided.
     */
    prepareUpdate(config: DripListUpdateConfig): Promise<PrepareDripListUpdateResult>;
    /**
     * Updates a Drip List.
     *
     * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
     * @param config - Configuration specifying what to update in the Drip List.
     *
     * @returns An object containing the transaction response, new metadata, and IPFS hash.
     *
     * @throws {DripsError} If the Drip List is not found, chain is not supported, no updates are provided, or transaction execution fails.
     */
    update(config: DripListUpdateConfig): Promise<UpdateDripListResult>;
}

type OneTimeDonation = {
    /** The receiver of the donation. */
    readonly receiver: SdkReceiver;
    /** The amount to donate in human-readable format (e.g., "10.5" for 10.5 USDC) */
    readonly amount: string;
    /** The ERC-20 token address to donate. */
    readonly erc20: Address;
    /**
     * The number of decimal places for the token (e.g. 18 for ETH, 6 for USDC).
     */
    readonly tokenDecimals: number;
    /** Optional transaction overrides for the batched transaction. */
    batchedTxOverrides?: BatchedTxOverrides;
};
declare function prepareOneTimeDonation(adapter: WriteBlockchainAdapter, donation: OneTimeDonation): Promise<PreparedTx>;

type SendContinuousDonationResult = {
    readonly txResponse: TxResponse;
    readonly ipfsHash: string;
    readonly metadata: Metadata;
};
declare function sendContinuousDonation(adapter: WriteBlockchainAdapter, ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<StreamsMetadata>, donation: ContinuousDonation, graphqlClient?: DripsGraphQLClient): Promise<SendContinuousDonationResult>;

interface DonationsModule {
    /**
     * Prepares a transaction for making a one-time donation.
     *
     * @param donation - Configuration for the one-time donation.
     *
     * @returns A prepared transaction ready for execution.
     *
     * @throws {DripsError} If the chain is not supported or receiver resolution fails.
     */
    prepareOneTime(donation: OneTimeDonation): Promise<PreparedTx>;
    /**
     * Sends a one-time donation.
     *
     * @param donation - The one-time donation configuration to send.
     *
     * @returns The transaction response from the blockchain.
     *
     * @throws {DripsError} If the chain is not supported, receiver resolution fails, or transaction execution fails.
     */
    sendOneTime(donation: OneTimeDonation): Promise<TxResponse>;
    /**
     * Prepares the context for a continuous donation stream.
     *
     * @param ipfsMetadataUploaderFn - A function to upload metadata to IPFS.
     * @param donation - Configuration for the donation stream.
     *
     * @returns An object containing the prepared transaction, IPFS hash, and metadata.
     */
    prepareContinuous(donation: ContinuousDonation): Promise<PrepareContinuousDonationResult>;
    /**
     * Sends a continuous donation by preparing and executing the transaction.
     *
     * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
     * @param donation - Configuration for the continuous donation stream.
     *
     * @returns An object containing the transaction response, metadata, and IPFS hash.
     *
     * @throws {DripsError} If the chain is not supported, validation fails, or transaction execution fails.
     */
    sendContinuous(donation: ContinuousDonation): Promise<SendContinuousDonationResult>;
}

interface UtilsModule {
    /**
     * Builds a `PreparedTx` that can be executed by a `WriteBlockchainAdapter`.
     *
     * @param request - The transaction request parameters including ABI, function name, arguments, and contract address.
     *
     * @returns A `PreparedTx` ready for execution.
     */
    buildTx: typeof buildTx;
    /**
     * Calculates the (`AddressDriver`) account ID for a given address.
     *
     * @param address - The address for which to compute the account ID.
     *
     * @returns The calculated account ID.
     *
     * @throws {DripsError} If the chain is not supported.
     */
    calcAddressId: (address: Address) => Promise<bigint>;
    /**
     * Calculates the (`RepoDriver`) account ID for a project.
     *
     * @param forge - The forge provider (currently only `'github'` is supported).
     * @param name - The project name in the format `'owner/repo'`.
     *
     * @returns The calculated account ID.
     *
     * @throws {DripsError} If the chain is not supported.
     */
    calcProjectId: (forge: Forge$1, name: ProjectName) => Promise<bigint>;
    /**
     * Calculates the (`RepoDriver`) account ID for an ORCID identity.
     *
     * @param orcidId - The ORCID ID (format: `'0000-0000-0000-0000'`).
     *
     * @returns The calculated account ID.
     *
     * @throws {DripsError} If the chain is not supported or ORCID ID is invalid.
     */
    calcOrcidAccountId: (orcidId: string) => Promise<bigint>;
    /**
     * Encodes a `StreamConfig` into a `bigint` representation.
     *
     * @param config - The stream config to encode.
     * @returns A bigint representing the packed stream config.
     */
    encodeStreamConfig: typeof encodeStreamConfig;
    /**
     * Decodes a `bigint` representation of a stream config into a `StreamConfig` object.
     *
     * @param packed - The encoded stream config.
     * @returns A validated `StreamConfig` object.
     */
    decodeStreamConfig: typeof decodeStreamConfig;
    /**
     * Resolves the driver name from an`accountId`.
     *
     * Known driver IDs:
     * - `0`: "address"
     * - `1`: "nft"
     * - `2`: "immutableSplits"
     * - `3`: "repo"
     * - `4`: "repoSubAccount"
     *
     * @param accountId - The account ID.
     * @returns The driver name.
     * @throws {DripsError} If the account ID is out of range or the driver is unknown.
     */
    resolveDriverName: typeof resolveDriverName;
    /**
     * Resolves the address from an `AddressDriver` account ID.
     *
     * @param accountId - The `AddressDriver` account ID, which is a bigint.
     * @returns The resolved address (checksummed).
     * @throws {DripsError} If the ID is out of range or not zero-padded correctly.
     */
    resolveAddressFromAddressDriverId: typeof resolveAddressFromAddressDriverId;
}

type WaitForOrcidOwnershipParams = {
    /** The ORCID ID to wait for ownership confirmation. */
    readonly orcidId: string;
    /** Expected owner address. If not provided, uses adapter's address. */
    readonly expectedOwner?: Address;
    /** Polling interval in milliseconds. Default: 3000ms. */
    readonly pollIntervalMs?: number;
    /** Timeout in milliseconds. Default: 120000ms (2 minutes). */
    readonly timeoutMs?: number;
    /** Progress callback invoked after each poll with elapsed time. */
    readonly onProgress?: (elapsedMs: number) => void | Promise<void>;
};
declare function waitForOrcidOwnership(adapter: ReadBlockchainAdapter, params: WaitForOrcidOwnershipParams): Promise<void>;

type ProgressEvent = {
    readonly step: 'claiming';
    readonly txHash?: Hash;
} | {
    readonly step: 'waiting';
    readonly elapsedMs: number;
} | {
    readonly step: 'configuring';
    readonly orcidAccountId: bigint;
};
type ClaimOrcidParams = {
    /** The ORCID ID to claim (e.g., '0000-0002-1825-0097'). */
    readonly orcidId: string;
    /** Optional wait parameters for ownership polling. */
    readonly waitOptions?: Omit<WaitForOrcidOwnershipParams, 'orcidId'>;
    /** Optional progress callback invoked at each step with typed event data. */
    readonly onProgress?: (event: ProgressEvent) => void | Promise<void>;
};
type ClaimOrcidStepResult<T = void> = {
    success: true;
    data: T;
} | {
    success: false;
    error: Error;
};
type ClaimOrcidResult = {
    /** The ORCID account ID. */
    readonly orcidAccountId: bigint;
    /** Step 1: Claim transaction result. */
    readonly claim: ClaimOrcidStepResult<{
        hash: Hash;
        /** Whether transaction was mined successfully. */
        mined: boolean;
    }>;
    /** Step 2: Ownership verification result. */
    readonly ownership: ClaimOrcidStepResult<{
        /** Verified owner address. */
        owner: Address;
        /** Time taken to verify (ms). */
        verificationTimeMs: number;
    }>;
    /** Step 3: Splits configuration result. */
    readonly splits: ClaimOrcidStepResult<{
        hash: Hash;
        /** Whether transaction was mined successfully. */
        mined: boolean;
    }>;
    /** Overall status helper. */
    readonly status: 'complete' | 'partial' | 'failed';
};
declare function claimOrcid(adapter: WriteBlockchainAdapter, params: ClaimOrcidParams): Promise<ClaimOrcidResult>;

type PrepareClaimOrcidParams = {
    /** The ORCID ID to claim (e.g., '0000-0002-1825-0097'). */
    readonly orcidId: string;
};
type PrepareClaimOrcidResult = {
    /** The ORCID account ID. */
    readonly orcidAccountId: bigint;
    /** Transaction to submit claim via requestUpdateOwner. */
    readonly claimTx: PreparedTx;
    /** Transaction to configure splits to 100% to claimer. */
    readonly setSplitsTx: PreparedTx;
};
declare function prepareClaimOrcid(adapter: WriteBlockchainAdapter, params: PrepareClaimOrcidParams): Promise<PrepareClaimOrcidResult>;

interface LinkedIdentitiesModule {
    /**
     * Claims an ORCID identity.
     *
     * This method orchestrates the full ORCID claiming flow:
     * 1. Submits claim transaction via `requestUpdateOwner`
     * 2. Polls for ownership confirmation via oracle verification
     * 3. Configures splits to 100% to claimer's address account
     *
     * Each step's result is captured independently, allowing partial recovery
     * if later steps fail. Check `result.status` for overall outcome.
     *
     * @param params - Claim and configuration parameters.
     *
     * @returns Detailed result object with step-by-step status and data.
     * - `status: 'complete'` - All steps succeeded
     * - `status: 'partial'` - Claim succeeded but ownership/splits failed
     * - `status: 'failed'` - Claim transaction failed
     *
     * @example
     * ```typescript
     * const result = await sdk.linkedIdentities.claimOrcid({ orcidId: '0000-0002-1825-0097' });
     *
     * if (result.status === 'complete') {
     *   console.log('✓ Fully claimed:', result.splits.data.hash);
     * } else if (result.ownership.success && !result.splits.success) {
     *   console.log('Owned but splits failed:', result.splits.error);
     *   // Manual recovery: call setSplits separately
     * }
     * ```
     */
    claimOrcid(params: ClaimOrcidParams): Promise<ClaimOrcidResult>;
    /**
     * Prepares transactions for claiming an ORCID identity.
     *
     * Returns prepared transactions without executing them:
     * 1. Claim transaction (requestUpdateOwner)
     * 2. Splits configuration transaction (setSplits to 100% to caller's address)
     *
     * Use this for transaction batching, gas estimation, or custom execution flows.
     *
     * @param params - ORCID ID to claim.
     *
     * @returns Prepared transactions and associated account IDs.
     */
    prepareClaimOrcid(params: PrepareClaimOrcidParams): Promise<PrepareClaimOrcidResult>;
    /**
     * Polls for ownership confirmation of an ORCID identity.
     *
     * @param params - Polling parameters including ORCID ID and timeout.
     *
     * @returns Promise that resolves when ownership is confirmed.
     *
     * @throws {DripsError} If ownership is not confirmed within timeout or validation fails.
     */
    waitForOrcidOwnership(params: WaitForOrcidOwnershipParams): Promise<void>;
}

type OnChainStreamReceiver = {
    accountId: bigint;
    config: bigint;
};

/**
 * Represents the historical state of streams for a specific update.
 */
type StreamsHistory = {
    /** Hash of the streams configuration at this point in history. */
    streamsHash: Hex;
    /** List of stream receivers that were active at this time. */
    receivers: OnChainStreamReceiver[];
    /** Timestamp when this streams configuration was updated. */
    updateTime: number;
    /** Maximum end time for streams in this configuration. */
    maxEnd: number;
};
/**
 * Arguments required for squeezing streams from a specific sender.
 */
type SqueezeArgs = {
    /** The account ID that will receive the squeezed funds. */
    accountId: string;
    /** The ERC-20 token address for the streams to squeeze. */
    tokenAddress: string;
    /** The account ID of the sender whose streams will be squeezed. */
    senderId: bigint;
    /** Hash of the complete streams history for verification. */
    historyHash: Hex;
    /** Array of historical streams states needed for squeezing. */
    streamsHistory: StreamsHistory[];
};
type CollectConfig = {
    /** The account ID that will collect the funds. */
    readonly accountId: bigint;
    /** Current splits receivers configuration for the account. */
    readonly currentReceivers: SdkSplitsReceiver[];
    /** List of ERC-20 token addresses to collect funds for. */
    readonly tokenAddresses: ReadonlyArray<Address>;
    /** Optional transaction overrides for the batched transaction. */
    readonly batchedTxOverrides?: BatchedTxOverrides;
    /** Whether to skip the split operation during collection. */
    readonly shouldSkipSplit?: boolean;
    /** Whether to automatically unwrap wrapped native tokens to native tokens. */
    readonly shouldAutoUnwrap?: boolean;
    /** Whether to skip receiving streams during collection. */
    readonly shouldSkipReceive?: boolean;
    /** Optional arguments for squeezing streams from specific senders. */
    readonly squeezeArgs?: SqueezeArgs[];
    /** Optional address to transfer collected funds to. If not provided, funds go to the signer. */
    readonly transferToAddress?: Address;
};
declare function prepareCollection(adapter: WriteBlockchainAdapter, config: CollectConfig): Promise<PreparedTx>;

type GetUserByAddressQuery = {
    __typename: 'Query';
    userByAddress: {
        __typename: 'User';
        chainData: Array<{
            __typename: 'UserData';
            withdrawableBalances: Array<{
                __typename: 'WithdrawableBalance';
                tokenAddress: string;
                collectableAmount: string;
                receivableAmount: string;
                splittableAmount: string;
            }>;
        }>;
    };
};

type UserWithdrawableBalances = GetUserByAddressQuery['userByAddress']['chainData'];
declare function getUserWithdrawableBalances(address: Address, chainId: number, graphqlClient?: DripsGraphQLClient): Promise<UserWithdrawableBalances>;

interface FundsModule {
    /**
     * Fetches withdrawable balances for the connected user on a specific chain.
     *
     * @param chainId - The chain ID for the target network.
     *
     * @throws {DripsError} If the chain is not supported.
     * @returns An object containing the user's withdrawable balances.
     */
    getWithdrawableBalances(chainId: number): Promise<UserWithdrawableBalances>;
    /**
     * Prepares a transaction for collecting funds from streams and splits.
     *
     * @param config - Configuration for the collection operation.
     *
     * @returns A prepared transaction ready for execution.
     *
     * @throws {DripsError} If the chain is not supported, no tokens are provided, or configuration is invalid.
     */
    prepareCollection(config: CollectConfig): Promise<PreparedTx>;
    /**
     * Collects funds for an account.
     *
     * @param config - Configuration for the collection operation.
     *
     * @returns The transaction response from the blockchain.
     *
     * @throws {DripsError} If the chain is not supported, no tokens are provided, configuration is invalid, or transaction execution fails.
     */
    collect(config: CollectConfig): Promise<TxResponse>;
}

interface DripsSdk {
    readonly dripLists: DripListsModule;
    readonly donations: DonationsModule;
    readonly utils: UtilsModule;
    readonly funds: FundsModule;
    readonly linkedIdentities: LinkedIdentitiesModule;
    readonly constants: typeof dripsConstants;
}
type DripsSdkOptions = {
    readonly graphql?: {
        readonly url?: string;
        readonly apiKey?: string;
    };
};
interface EthersLikeProvider {
    call: (...args: any[]) => Promise<any>;
    getNetwork: () => Promise<{
        chainId: bigint | number;
    }>;
}
interface EthersLikeSigner {
    getAddress: () => Promise<string>;
    signMessage: (message: string | Uint8Array) => Promise<any>;
    sendTransaction: (...args: any[]) => Promise<any>;
    provider?: unknown;
}
type SupportedBlockchainClient = PublicClient | WalletClient | EthersLikeProvider | EthersLikeSigner | (ReadBlockchainAdapter & {
    type: 'custom';
}) | (WriteBlockchainAdapter & {
    type: 'custom';
});
/**
 * Creates an instance of the Drips SDK.
 *
 * ## Blockchain Client Support
 *
 * The SDK supports multiple blockchain client libraries:
 *
 * ### Viem
 * - **`PublicClient`**: For read-only operations (querying data, no transactions)
 * - **`WalletClient`**: For full functionality including write operations (creating drip lists, donations, etc.)
 *   - **Important**: Must have an account connected via the `account` property
 *
 * ### Ethers v6
 * - **`Provider`**: For read-only operations (querying data, no transactions)
 * - **`Signer`**: For full functionality including write operations
 *
 * ### Custom Adapters
 * - **`ReadBlockchainAdapter`**: Custom read-only adapter
 * - **`WriteBlockchainAdapter`**: Custom adapter with transaction capabilities
 *
 * ## Operation Types
 *
 * All **write operations** require:
 * - A blockchain client with signing capability:
 *   - **Viem**: `WalletClient` with a connected `account`
 *   - **Ethers**: `Signer` with a connected `provider`
 * - Connection to the target **blockchain network**
 *
 * **Read operations** work with any client type.
 *
 * @param blockchainClient - A blockchain client for network interaction. Supports:
 *   - **Viem**: `PublicClient` (read-only) or `WalletClient` (read/write, requires connected account)
 *   - **Ethers v6**: `Provider` (read-only) or `Signer` (read/write)
 *   - **Custom**: `ReadBlockchainAdapter` or `WriteBlockchainAdapter` with `{type: 'custom'}`
 *
 * @param ipfsMetadataUploaderFn - Optional function for uploading metadata to IPFS. Required only for
 *   write operations. The SDK provides
 *   `createPinataIpfsMetadataUploader()` for Pinata integration. Read-only operations work without this parameter.
 *
 * @param options - Optional configuration object
 * @param options.graphql - GraphQL endpoint configuration
 * @param options.graphql.url - Custom GraphQL endpoint URL (defaults to Drips network endpoint)
 * @param options.graphql.apiKey - API key for authenticated GraphQL requests
 *
 * @returns A `DripsSdk` instance
 */
declare function createDripsSdk(blockchainClient: SupportedBlockchainClient, ipfsMetadataUploaderFn?: IpfsMetadataUploaderFn<Metadata>, options?: DripsSdkOptions): DripsSdk;

declare function createViemReadAdapter(publicClient: PublicClient): ReadBlockchainAdapter;
declare function createViemWriteAdapter(walletClient: WalletClient & {
    account: Account;
}): WriteBlockchainAdapter;

declare function sendOneTimeDonation(adapter: WriteBlockchainAdapter, donation: OneTimeDonation): Promise<TxResponse>;

declare function collect(adapter: WriteBlockchainAdapter, config: CollectConfig): Promise<TxResponse>;

declare const contractsRegistry: {
    readonly 1: {
        readonly repoDriver: {
            readonly address: "0x770023d55D09A9C110694827F1a6B32D5c2b373E";
        };
        readonly nftDriver: {
            readonly address: "0xcf9c49B0962EDb01Cdaa5326299ba85D72405258";
        };
        readonly addressDriver: {
            readonly address: "0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610";
        };
        readonly drips: {
            readonly address: "0xd0Dd053392db676D57317CD4fe96Fc2cCf42D0b4";
        };
        readonly caller: {
            readonly address: "0x60F25ac5F289Dc7F640f948521d486C964A248e5";
        };
        readonly nativeTokenUnwrapper: {
            readonly address: undefined;
        };
    };
    readonly 80002: {
        readonly repoDriver: {
            readonly address: "0x54372850Db72915Fd9C5EC745683EB607b4a8642";
        };
        readonly nftDriver: {
            readonly address: "0xDafd9Ab96E62941808caa115D184D30A200FA777";
        };
        readonly addressDriver: {
            readonly address: "0x004310a6d47893Dd6e443cbE471c24aDA1e6c619";
        };
        readonly drips: {
            readonly address: "0xeebCd570e50fa31bcf6eF10f989429C87C3A6981";
        };
        readonly caller: {
            readonly address: "0x5C7c5AA20b15e13229771CB7De36Fe1F54238372";
        };
        readonly nativeTokenUnwrapper: {
            readonly address: undefined;
        };
    };
    readonly 11155420: {
        readonly repoDriver: {
            readonly address: "0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B";
        };
        readonly nftDriver: {
            readonly address: "0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44";
        };
        readonly addressDriver: {
            readonly address: "0x70E1E1437AeFe8024B6780C94490662b45C3B567";
        };
        readonly drips: {
            readonly address: "0x74A32a38D945b9527524900429b083547DeB9bF4";
        };
        readonly caller: {
            readonly address: "0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee";
        };
        readonly nativeTokenUnwrapper: {
            readonly address: undefined;
        };
    };
    readonly 11155111: {
        readonly repoDriver: {
            readonly address: "0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B";
        };
        readonly nftDriver: {
            readonly address: "0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44";
        };
        readonly addressDriver: {
            readonly address: "0x70E1E1437AeFe8024B6780C94490662b45C3B567";
        };
        readonly drips: {
            readonly address: "0x74A32a38D945b9527524900429b083547DeB9bF4";
        };
        readonly caller: {
            readonly address: "0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee";
        };
        readonly nativeTokenUnwrapper: {
            readonly address: undefined;
        };
    };
    readonly 31337: {
        readonly repoDriver: {
            readonly address: "0x971e08fc533d2A5f228c7944E511611dA3B56B24";
        };
        readonly nftDriver: {
            readonly address: "0xf98e07d281Ff9b83612DBeF0A067d710716720eA";
        };
        readonly addressDriver: {
            readonly address: "0x1707De7b41A3915F990A663d27AD3a952D50151d";
        };
        readonly drips: {
            readonly address: "0x7CBbD3FdF9E5eb359E6D9B12848c5Faa81629944";
        };
        readonly caller: {
            readonly address: "0x2eac4218a453B1A52544Be315d2376B9A76614F1";
        };
        readonly nativeTokenUnwrapper: {
            readonly address: undefined;
        };
    };
    readonly 84532: {
        readonly repoDriver: {
            readonly address: "0x54372850Db72915Fd9C5EC745683EB607b4a8642";
        };
        readonly nftDriver: {
            readonly address: "0xDafd9Ab96E62941808caa115D184D30A200FA777";
        };
        readonly addressDriver: {
            readonly address: "0x004310a6d47893Dd6e443cbE471c24aDA1e6c619";
        };
        readonly drips: {
            readonly address: "0xeebCd570e50fa31bcf6eF10f989429C87C3A6981";
        };
        readonly caller: {
            readonly address: "0x5C7c5AA20b15e13229771CB7De36Fe1F54238372";
        };
        readonly nativeTokenUnwrapper: {
            readonly address: undefined;
        };
    };
    readonly 314: {
        readonly repoDriver: {
            readonly address: "0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257";
        };
        readonly nftDriver: {
            readonly address: "0x2F23217A87cAf04ae586eed7a3d689f6C48498dB";
        };
        readonly addressDriver: {
            readonly address: "0x04693D13826a37dDdF973Be4275546Ad978cb9EE";
        };
        readonly drips: {
            readonly address: "0xd320F59F109c618b19707ea5C5F068020eA333B3";
        };
        readonly caller: {
            readonly address: "0xd6Ab8e72dE3742d45AdF108fAa112Cd232718828";
        };
        readonly nativeTokenUnwrapper: {
            readonly address: "0x64e0d60C70e9778C2E649FfBc90259C86a6Bf396";
        };
    };
    readonly 1088: {
        readonly repoDriver: {
            readonly address: "0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257";
        };
        readonly nftDriver: {
            readonly address: "0x2F23217A87cAf04ae586eed7a3d689f6C48498dB";
        };
        readonly addressDriver: {
            readonly address: "0x04693D13826a37dDdF973Be4275546Ad978cb9EE";
        };
        readonly drips: {
            readonly address: "0xd320F59F109c618b19707ea5C5F068020eA333B3";
        };
        readonly caller: {
            readonly address: "0xd6Ab8e72dE3742d45AdF108fAa112Cd232718828";
        };
        readonly nativeTokenUnwrapper: {
            readonly address: undefined;
        };
    };
    readonly 10: {
        readonly repoDriver: {
            readonly address: "0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257";
        };
        readonly nftDriver: {
            readonly address: "0x2F23217A87cAf04ae586eed7a3d689f6C48498dB";
        };
        readonly addressDriver: {
            readonly address: "0x04693D13826a37dDdF973Be4275546Ad978cb9EE";
        };
        readonly drips: {
            readonly address: "0xd320F59F109c618b19707ea5C5F068020eA333B3";
        };
        readonly caller: {
            readonly address: "0xd6Ab8e72dE3742d45AdF108fAa112Cd232718828";
        };
        readonly nativeTokenUnwrapper: {
            readonly address: "0x64e0d60C70e9778C2E649FfBc90259C86a6Bf396";
        };
    };
};

declare const utils: {
    buildTx: typeof buildTx;
    calcAddressId: typeof calcAddressId;
    calcProjectId: typeof calcProjectId;
    calcOrcidAccountId: typeof calcOrcidAccountId;
    calcDripListId: typeof calcDripListId;
    encodeStreamConfig: typeof encodeStreamConfig;
    decodeStreamConfig: typeof decodeStreamConfig;
    resolveDriverName: typeof resolveDriverName;
    resolveAddressFromAddressDriverId: typeof resolveAddressFromAddressDriverId;
};

declare const dripsConstants: {
    MAX_SPLITS_RECEIVERS: number;
    TOTAL_SPLITS_WEIGHT: number;
    MAX_STREAMS_RECEIVERS: number;
    AMT_PER_SEC_MULTIPLIER: number;
    AMT_PER_SEC_EXTRA_DECIMALS: number;
    CYCLE_SECS: number;
};

export { type ClaimOrcidParams, type ClaimOrcidResult, type ClaimOrcidStepResult, type CollectConfig, type ContinuousDonation, type CreateDripListResult, type DripList, type DripListMetadata, type DripListUpdateConfig, type DripsGraphQLClient, type DripsSdk, type Forge$1 as Forge, type IpfsMetadataUploaderFn, type Metadata, type MetadataSplitsReceiver, type NewDripList, type OnChainSplitsReceiver, type OnChainStreamReceiver, type OneTimeDonation, type PrepareClaimOrcidParams, type PrepareClaimOrcidResult, type PrepareContinuousDonationResult, type PrepareDripListCreationResult, type PrepareDripListUpdateResult, PreparedTx, type ProjectMetadata, type ProjectName, ReadBlockchainAdapter, type SdkAddressReceiver, type SdkDripListReceiver, type SdkEcosystemMainAccountReceiver, type SdkOrcidReceiver, type SdkProjectReceiver, type SdkReceiver, type SdkSplitsReceiver, type SdkSubListReceiver, type SendContinuousDonationResult, type SqueezeArgs, type StreamConfig, type StreamsHistory, type SubListMetadata, TimeUnit, TxResponse, type UpdateDripListResult, type UserWithdrawableBalances, type WaitForOrcidOwnershipParams, WriteBlockchainAdapter, claimOrcid, collect, contractsRegistry, createDripList, createDripsSdk, createPinataIpfsMetadataUploader, createViemReadAdapter, createViemWriteAdapter, dripsConstants, getDripListById, getUserWithdrawableBalances, prepareClaimOrcid, prepareCollection, prepareContinuousDonation, prepareDripListCreation, prepareDripListUpdate, prepareOneTimeDonation, sendContinuousDonation, sendOneTimeDonation, updateDripList, utils, waitForOrcidOwnership };
