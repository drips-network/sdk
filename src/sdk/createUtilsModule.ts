import {Address} from 'viem';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {calcAddressId} from '../internal/shared/calcAddressId';
import {
  calcProjectId,
  calcOrcidAccountId,
} from '../internal/projects/calcProjectId';
import {buildTx} from '../internal/shared/buildTx';
import {
  encodeStreamConfig,
  decodeStreamConfig,
} from '../internal/shared/streamRateUtils';
import {resolveDriverName} from '../internal/shared/resolveDriverName';
import {resolveAddressFromAddressDriverId} from '../internal/shared/resolveAddressFromAddressDriverId';
import {Forge, ProjectName} from '../internal/projects/calcProjectId';

export interface UtilsModule {
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
  calcProjectId: (forge: Forge, name: ProjectName) => Promise<bigint>;

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

type Deps = {
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
};

export function createUtilsModule(deps: Deps): UtilsModule {
  const {adapter} = deps;

  return {
    buildTx,
    calcAddressId: (address: Address) => calcAddressId(adapter, address),
    calcProjectId: (forge: Forge, name: ProjectName) =>
      calcProjectId(adapter, {forge, name}),
    calcOrcidAccountId: (orcidId: string) =>
      calcOrcidAccountId(adapter, orcidId),
    encodeStreamConfig,
    decodeStreamConfig,
    resolveDriverName,
    resolveAddressFromAddressDriverId,
  };
}
