import {
  PreparedTx,
  ReadBlockchainAdapter,
  TxResponse,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {
  CollectConfig,
  prepareCollection,
} from '../internal/collect/prepareCollection';
import {collect} from '../internal/collect/collect';

export interface CollectModule {
  prepareCollection: (config: CollectConfig) => Promise<PreparedTx>;

  collect: (config: CollectConfig) => Promise<TxResponse>;
}

type Deps = {
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
};

export function createCollectModule(deps: Deps): CollectModule {
  const {adapter} = deps;

  return {
    prepareCollection: (config: CollectConfig) => {
      return prepareCollection(adapter as WriteBlockchainAdapter, config);
    },

    collect: (config: CollectConfig) => {
      return collect(adapter as WriteBlockchainAdapter, config);
    },
  };
}
