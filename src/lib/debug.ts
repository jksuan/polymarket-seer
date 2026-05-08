export function isClientDebugEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_DEBUG_MODE === "1";
}

