import { createConfig, http } from "wagmi";
import { abstractTestnet } from "viem/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [abstractTestnet],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: "ABS WorldPool" }),
  ],
  transports: {
    [abstractTestnet.id]: http("https://api.testnet.abs.xyz"),
  },
  ssr: true,
});
