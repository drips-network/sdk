import {
  PreparedTx,
  ReadBlockchainAdapter,
  TxResponse,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {
  prepareOneTimeDonationTx,
  SendOneTimeDonationParams,
} from '../internal/donations/prepareOneTimeDonationTx';
import {sendOneTimeDonation} from '../internal/donations/sendOneTimeDonation';

export interface DonationsModule {
  prepareOneTimeDonationTx: (
    params: SendOneTimeDonationParams,
  ) => Promise<PreparedTx>;
  sendOneTime(params: SendOneTimeDonationParams): Promise<TxResponse>;
}

type Deps = {
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
};

export function createDonationsModule(deps: Deps): DonationsModule {
  const {adapter} = deps;

  return {
    prepareOneTimeDonationTx: (params: SendOneTimeDonationParams) =>
      prepareOneTimeDonationTx(adapter as WriteBlockchainAdapter, params),
    sendOneTime: async (params: SendOneTimeDonationParams) =>
      sendOneTimeDonation(adapter as WriteBlockchainAdapter, params),
  };
}
