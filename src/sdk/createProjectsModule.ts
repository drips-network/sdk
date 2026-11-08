import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {
  calcProjectId,
  Forge,
  ProjectName,
} from '../internal/projects/calcProjectId';
import {
  claimProject,
  ClaimProjectParams,
  ClaimProjectResult,
} from '../internal/projects/claimProject';
import {
  prepareClaimProject,
  PrepareClaimProjectParams,
  PrepareClaimProjectResult,
} from '../internal/projects/prepareClaimProject';
import {
  waitForProjectOwnership,
  WaitForProjectOwnershipParams,
} from '../internal/projects/waitForProjectOwnership';
import {
  requireMetadataUploader,
  requireWriteAccess,
} from '../internal/shared/assertions';
import {
  IpfsMetadataUploaderFn,
  Metadata,
} from '../internal/shared/createPinataIpfsMetadataUploader';

export interface ProjectsModule {
  /**
   * Calculates the (`RepoDriver`) account ID for a project.
   *
   * @param forge - The forge provider (currently `'github'`).
   * @param name - The project name in the format `'owner/repo'`.
   *
   * @returns The calculated project account ID.
   *
   * @throws {DripsError} If the chain is not supported.
   */
  calculateId(forge: Forge, name: ProjectName): Promise<bigint>;

  /**
   * Claims a project and configures its splits and metadata.
   *
   * This method orchestrates the full project claiming flow:
   * 1. Submits claim transaction via `RepoDriver.requestUpdateOwner`
   * 2. Polls for ownership confirmation via oracle verification
   * 3. Uploads project metadata to IPFS and executes a batched `Caller` transaction
   *    to set project splits (`setSplits`) and emit account metadata (`emitAccountMetadata`)
   *
   * @param params - Claim, splits, and metadata configuration parameters.
   *
   * @returns Detailed result object with step-by-step status and data.
   */
  claim(params: ClaimProjectParams): Promise<ClaimProjectResult>;

  /**
   * Prepares transactions and uploads metadata for claiming a project.
   *
   * Returns prepared transactions without executing them:
   * 1. `claimTx`: `RepoDriver.requestUpdateOwner`
   * 2. `configureTx`: `Caller.callBatched` (`RepoDriver.setSplits` + `RepoDriver.emitAccountMetadata`)
   *
   * @param params - Project URL, splits, and metadata configuration.
   *
   * @returns Prepared transactions, IPFS hash, metadata, and project account ID.
   */
  prepareClaim(
    params: PrepareClaimProjectParams,
  ): Promise<PrepareClaimProjectResult>;

  /**
   * Polls for ownership confirmation of a project.
   *
   * @param params - Polling parameters including project URL and timeout.
   *
   * @returns Promise that resolves when ownership is confirmed.
   *
   * @throws {DripsError} If ownership is not confirmed within timeout or validation fails.
   */
  waitForOwnership(params: WaitForProjectOwnershipParams): Promise<void>;
}

type Deps = {
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
  readonly ipfsMetadataUploaderFn?: IpfsMetadataUploaderFn<Metadata>;
};

export function createProjectsModule(deps: Deps): ProjectsModule {
  const {adapter, ipfsMetadataUploaderFn} = deps;

  return {
    calculateId: (forge: Forge, name: ProjectName): Promise<bigint> =>
      calcProjectId(adapter, {forge, name}),

    claim: (params: ClaimProjectParams): Promise<ClaimProjectResult> => {
      requireWriteAccess(adapter, claimProject.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, claimProject.name);
      return claimProject(adapter, ipfsMetadataUploaderFn, params);
    },

    prepareClaim: (
      params: PrepareClaimProjectParams,
    ): Promise<PrepareClaimProjectResult> => {
      requireWriteAccess(adapter, prepareClaimProject.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, prepareClaimProject.name);
      return prepareClaimProject(adapter, ipfsMetadataUploaderFn, params);
    },

    waitForOwnership: (params: WaitForProjectOwnershipParams): Promise<void> =>
      waitForProjectOwnership(adapter, params),
  };
}
