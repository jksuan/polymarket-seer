export const bridgeKeys = {
  supportedAssets: () => ["/api/bridge/supported-assets"] as const,
  status: (address: string) => ["/api/bridge/status", address] as const,
};

export type BridgeSupportedAssetsKey = ReturnType<typeof bridgeKeys.supportedAssets>;
export type BridgeStatusKey = ReturnType<typeof bridgeKeys.status>;
