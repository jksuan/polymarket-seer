import { isValidApiKeyCreds, type ClobApiKeyCredsLike } from "@/lib/clobApiKeyCreds";
import { isUserRejection } from "./clobCredentialErrors";

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
  /** 用户主动取消 ClobAuth EIP-712 签名 */
  userRejected?: boolean;
};

type DeriveOrCreateResult = {
  creds: ValidClobApiKeyCreds | null;
  userRejected: boolean;
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

async function tryCreateApiKey(clobClient: ClobApiKeyClient): Promise<DeriveOrCreateResult> {
  try {
    const created = await clobClient.createApiKey();
    return {
      creds: isValidApiKeyCreds(created) ? created : null,
      userRejected: false,
    };
  } catch (err) {
    return {
      creds: null,
      userRejected: isUserRejection(err),
    };
  }
}

async function deriveOrCreateApiKey(
  clobClient: ClobApiKeyClient,
  switchChain: () => Promise<void>
): Promise<DeriveOrCreateResult> {
  await switchChain();
  try {
    const derived = await clobClient.deriveApiKey();
    if (isValidApiKeyCreds(derived)) {
      return { creds: derived, userRejected: false };
    }
    return tryCreateApiKey(clobClient);
  } catch (deriveErr) {
    if (isUserRejection(deriveErr)) {
      return { creds: null, userRejected: true };
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
    if (resolved.userRejected) {
      return { creds: null, hasCreds: false, userRejected: true };
    }
    if (isValidApiKeyCreds(resolved.creds)) {
      setCachedCreds(walletAddress, resolved.creds);
      return { creds: resolved.creds, hasCreds: true };
    }
    return { creds: null, hasCreds: false };
  }

  if (isValidApiKeyCreds(creds)) {
    return { creds, hasCreds: true };
  }

  return { creds: null, hasCreds: false };
}
