// src/internal/shared/DripsError.ts
var DripsError = class extends Error {
  cause;
  meta;
  constructor(message, options) {
    super(`[Drips SDK] ${message}`, { cause: options?.cause });
    this.name = "DripsError";
    this.cause = options?.cause;
    this.meta = options?.meta;
  }
};

// src/internal/blockchain/adapters/ethers/ethersMappers.ts
function mapToEthersTransactionRequest(tx) {
  const baseRequest = {
    to: tx.to,
    data: tx.data,
    value: tx.value !== void 0 ? tx.value : void 0,
    gasLimit: tx.gasLimit !== void 0 ? tx.gasLimit : void 0,
    nonce: tx.nonce
  };
  if (tx.maxFeePerGas !== void 0 || tx.maxPriorityFeePerGas !== void 0) {
    if (tx.gasPrice !== void 0) {
      throw new DripsError(
        "Cannot specify both EIP-1559 and legacy gas parameters.",
        {
          meta: {
            gasPrice: tx.gasPrice,
            maxFeePerGas: tx.maxFeePerGas,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
            operation: mapToEthersTransactionRequest.name
          }
        }
      );
    }
    return {
      ...baseRequest,
      maxFeePerGas: tx.maxFeePerGas !== void 0 ? tx.maxFeePerGas : void 0,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas !== void 0 ? tx.maxPriorityFeePerGas : void 0
    };
  } else if (tx.gasPrice !== void 0) {
    return {
      ...baseRequest,
      gasPrice: tx.gasPrice
    };
  }
  return baseRequest;
}
function mapFromEthersResponse(ethersResponse) {
  return {
    hash: ethersResponse.hash,
    wait: async (confirmations = 1) => {
      const receipt = await ethersResponse.wait(confirmations);
      if (!receipt) {
        throw new DripsError("Transaction receipt not found");
      }
      return mapFromEthersReceipt(receipt);
    }
  };
}
function mapFromEthersReceipt(ethersReceipt) {
  const { status, gasUsed, hash, blockNumber, logs, from, to } = ethersReceipt;
  return {
    from,
    logs,
    gasUsed,
    blockNumber: BigInt(blockNumber),
    to: to === null ? void 0 : to,
    hash,
    status: status === 1 ? "success" : "reverted"
  };
}

// src/internal/blockchain/adapters/ethers/createEthersMeta.ts
function createEthersMeta(tx, context) {
  return {
    to: tx.to,
    funcName: tx.abiFunctionName,
    account: context.account,
    chainId: context.chainId,
    operation: tx.abiFunctionName ?? context.operationFallback,
    gas: {
      gasLimit: tx.gasLimit,
      gasPrice: tx.gasPrice,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas
    }
  };
}

// src/internal/blockchain/adapters/ethers/ethersAdapters.ts
function createEthersReadAdapter(provider) {
  return {
    async call(tx) {
      const meta = createEthersMeta(tx, {
        operationFallback: "call"
      });
      try {
        const txReq = mapToEthersTransactionRequest(tx);
        const result = await provider.call(txReq);
        if (!result) {
          throw new DripsError("Contract call returned no data", { meta });
        }
        return result;
      } catch (error) {
        throw new DripsError("Contract read failed", { cause: error, meta });
      }
    },
    async getChainId() {
      try {
        const network = await provider.getNetwork();
        return Number(network.chainId);
      } catch (error) {
        throw new DripsError("Failed to get chain ID", { cause: error });
      }
    }
  };
}
function createEthersWriteAdapter(signer) {
  const provider = signer.provider;
  if (!provider) {
    throw new DripsError("Signer must have a provider");
  }
  const readOnlyAdapter = createEthersReadAdapter(provider);
  return {
    ...readOnlyAdapter,
    async getAddress() {
      const meta = {
        operation: "getAddress"
      };
      try {
        const address = await signer.getAddress();
        return address;
      } catch (error) {
        throw new DripsError("Failed to get signer address", {
          cause: error,
          meta
        });
      }
    },
    async sendTx(tx) {
      const signerAddress = await signer.getAddress();
      const meta = createEthersMeta(tx, {
        account: signerAddress,
        operationFallback: "sendTx"
      });
      try {
        const ethersRequest = mapToEthersTransactionRequest(tx);
        const ethersResponse = await signer.sendTransaction(ethersRequest);
        return {
          ...mapFromEthersResponse(ethersResponse),
          meta
        };
      } catch (error) {
        throw new DripsError(
          `Contract write failed (func: ${tx.abiFunctionName})`,
          { cause: error, meta }
        );
      }
    },
    async signMsg(message) {
      const meta = {
        message,
        operation: "signMsg"
      };
      try {
        const signature = await signer.signMessage(message);
        return signature;
      } catch (error) {
        throw new DripsError("Message signing failed", { cause: error, meta });
      }
    }
  };
}

export { DripsError, createEthersReadAdapter, createEthersWriteAdapter };
