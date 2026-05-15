import { isValidApiKeyCreds, type ClobApiKeyCredsLike } from "@/lib/clobApiKeyCreds";
import { isPermanentClobFailure, isUserRejection } from "./clobCredentialErrors";

export type ValidClobApiKeyCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

export type ClobApiKeyClient = {
  deriveApiKey: () => Promise<unknown>;
  createApiKey: () => Promise<unknown>;
};

export type ResolveClobApiKeyCredsParams = {
  walletAddress: string;
  getCachedCreds: (walletAddress: string) => ClobApiKeyCredsLike | null;
  clearCachedCredsForWallet: (walletAddress: string) => void;
  setCachedCreds: (walletAddress: string, creds: ValidClobApiKeyCreds) => void;
  switchChain: () => Promise<void>;
  clobClient: ClobApiKeyClient;
  hasAttemptedDerive: boolean;
  markDeriveAttempted: () => void;
};

export type ResolveClobApiKeyCredsResult = {
  creds: ValidClobApiKeyCreds | null;
  hasCreds: boolean;
};

function loadSanitizedCachedCreds(
  walletAddress: string,
  getCachedCreds: ResolveClobApiKeyCredsParams["getCachedCreds"],
  clearCachedCredsForWallet: ResolveClobApiKeyCredsParams["clearCachedCredsForWallet"]
): ClobApiKeyCredsLike | null {
  let creds = getCachedCreds(walletAddress);
  if (creds && !isValidApiKeyCreds(creds)) {
    clearCachedCredsForWallet(walletAddress);
    creds = null;
  }
  return creds;
}

async function tryCreateApiKey(
  clobClient: ClobApiKeyClient
): Promise<ValidClobApiKeyCreds | null> {
  try {
    const created = await clobClient.createApiKey();
    return isValidApiKeyCreds(created) ? created : null;
  } catch {
    return null;
  }
}

async function deriveOrCreateApiKey(
  clobClient: ClobApiKeyClient,
  switchChain: () => Promise<void>
): Promise<ValidClobApiKeyCreds | null> {
  await switchChain();
  try {
    const derived = await clobClient.deriveApiKey();
    if (isValidApiKeyCreds(derived)) {
      return derived;
    }
    return tryCreateApiKey(clobClient);
  } catch (deriveErr) {
    if (isUserRejection(deriveErr)) {
      return null;
    }
    if (isPermanentClobFailure(deriveErr)) {
      return tryCreateApiKey(clobClient);
    }
    return tryCreateApiKey(clobClient);
  }
}

/**
 * 解析并必要时申请 CLOB L2 API Key（derive → create），带缓存校验。
 */
export async function resolveClobApiKeyCreds(
  params: ResolveClobApiKeyCredsParams
): Promise<ResolveClobApiKeyCredsResult> {
  const {
    walletAddress,
    getCachedCreds,
    clearCachedCredsForWallet,
    setCachedCreds,
    switchChain,
    clobClient,
    hasAttemptedDerive,
    markDeriveAttempted,
  } = params;

  let creds = loadSanitizedCachedCreds(walletAddress, getCachedCreds, clearCachedCredsForWallet);

  if (isValidApiKeyCreds(creds)) {
    return { creds, hasCreds: true };
  }

  if (!creds && !hasAttemptedDerive) {
    markDeriveAttempted();
    const resolved = await deriveOrCreateApiKey(clobClient, switchChain);
    if (isValidApiKeyCreds(resolved)) {
      setCachedCreds(walletAddress, resolved);
      return { creds: resolved, hasCreds: true };
    }
    return { creds: null, hasCreds: false };
  }

  if (isValidApiKeyCreds(creds)) {
    return { creds, hasCreds: true };
  }

  return { creds: null, hasCreds: false };
}
