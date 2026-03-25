import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Card Sharkie",
  projectId: "card-sharkie-dapp",
  chains: [baseSepolia],
});
