const STORAGE_PREFIXES = ["wc@2:", "wc@", "walletconnect", "wallet_connect", "WALLET_CONNECT"];

const WC_INDEXED_DB_NAMES = ["WALLET_CONNECT_V2_INDEXED_DB"] as const;

function shouldRemoveStorageKey(key: string): boolean {
  const lower = key.toLowerCase();
  return STORAGE_PREFIXES.some(
    (prefix) => lower.startsWith(prefix.toLowerCase()) || lower.includes(prefix.toLowerCase())
  );
}

function clearMatchingKeys(storage: Storage): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && shouldRemoveStorageKey(key)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => storage.removeItem(key));
}

function deleteIndexedDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

/** ADR-0005：external 登出时清理 WalletConnect 残留 */
export async function clearWalletConnectStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    clearMatchingKeys(window.localStorage);
    clearMatchingKeys(window.sessionStorage);
  } catch (err) {
    console.warn("[退出登录] 清理 WalletConnect localStorage 失败:", err);
  }
  try {
    await Promise.all(WC_INDEXED_DB_NAMES.map((name) => deleteIndexedDb(name)));
  } catch (err) {
    console.warn("[退出登录] 清理 WalletConnect IndexedDB 失败:", err);
  }
}
