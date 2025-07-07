import { w as writable } from "./index.js";
const walletStore = writable({
  isConnected: false,
  address: null,
  provider: null,
  signer: null,
  isConnecting: false,
  error: null
});
export {
  walletStore as w
};
