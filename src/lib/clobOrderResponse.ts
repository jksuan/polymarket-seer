export type ClobOrderResponseLike = {
  success?: boolean;
  error?: string;
  errorMsg?: string;
  orderID?: string;
};

/** 从 CLOB V1/V2 下单响应中提取可读错误信息 */
export function parseClobOrderError(resp: unknown): string {
  if (!resp || typeof resp !== "object") {
    return JSON.stringify(resp);
  }

  const record = resp as ClobOrderResponseLike;
  let errorMsg = record.errorMsg || record.error || JSON.stringify(resp);

  try {
    const parsed = JSON.parse(errorMsg);
    if (parsed?.data?.error) {
      errorMsg = parsed.data.error;
    }
  } catch {
    // keep raw message
  }

  return errorMsg;
}

export function isClobOrderSuccess(resp: unknown): resp is ClobOrderResponseLike & { success: true } {
  return !!resp && typeof resp === "object" && (resp as ClobOrderResponseLike).success === true;
}
