/** 判断是否为用户主动拒绝签名 */
export function isUserRejection(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || "").toLowerCase();
  return (
    msg.includes("denied") ||
    msg.includes("rejected") ||
    msg.includes("user refused") ||
    msg.includes("user cancelled") ||
    msg.includes("user canceled")
  );
}

/** 判断是否为 CLOB 永久性失败（账户不存在 / 无法 derive） */
export function isPermanentClobFailure(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || "").toLowerCase();
  const data = (err as { response?: { data?: unknown }; data?: unknown })?.response?.data
    ?? (err as { data?: unknown })?.data;
  const dataStr = JSON.stringify(data || "").toLowerCase();
  return (
    msg.includes("could not derive api key") ||
    dataStr.includes("could not derive api key") ||
    msg.includes("could not create api key") ||
    dataStr.includes("could not create api key")
  );
}
