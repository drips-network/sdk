import {Address} from 'viem';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {calcAddressId} from '../internal/shared/calcAddressId';
import {calcProjectId} from '../internal/projects/calcProjectId';
import {calcDripListId} from '../internal/shared/calcDripListId';
import {buildTx} from '../internal/shared/buildTx';
import {
  encodeStreamConfig,
  decodeStreamConfig,
} from '../internal/shared/streamRateUtils';
import {encodeMetadataKeyValue} from '../internal/shared/encodeMetadataKeyValue';
import {resolveDriverName} from '../internal/shared/resolveDriverName';
import {resolveAddressFromAddressDriverId} from '../internal/shared/resolveAddressFromAddressDriverId';
import {Forge, ProjectName} from '../internal/projects/calcProjectId';

export interface UtilsModule {
  buildTx: typeof buildTx;
  calcAddressId: (address: Address) => Promise<bigint>;
  calcProjectId: (forge: Forge, name: ProjectName) => Promise<bigint>;
  calcDripListId: (params: {salt: bigint; minter: Address}) => Promise<bigint>;
  encodeStreamConfig: typeof encodeStreamConfig;
  decodeStreamConfig: typeof decodeStreamConfig;
  encodeMetadataKeyValue: typeof encodeMetadataKeyValue;
  resolveDriverName: typeof resolveDriverName;
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
    calcDripListId: (params: {salt: bigint; minter: Address}) =>
      calcDripListId(adapter, params),
    encodeStreamConfig,
    decodeStreamConfig,
    encodeMetadataKeyValue,
    resolveDriverName,
    resolveAddressFromAddressDriverId,
  };
}
