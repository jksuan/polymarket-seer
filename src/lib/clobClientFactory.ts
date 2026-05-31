import {
  ClobClient,
  Chain,
  SignatureTypeV2,
  type ApiKeyCreds,
} from "@polymarket/clob-client-v2";

import { CLOB_API_URL } from "@/lib/constants";

/** CLOB V2 订单归因：bytes32 builder code（可公开，与 Relayer API Key 不同） */
export function getPublicBuilderCode(): string | undefined {
  const code = process.env.NEXT_PUBLIC_POLY_BUILDER_CODE?.trim();
  return code || undefined;
}

export type ClobEthersSigner = {
  _signTypedData: (
    domain: Record<string, unknown>,
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, unknown>
  ) => Promise<string>;
  getAddress: () => Promise<string>;
};

export type CreateClobClientParams = {
  signer: ClobEthersSigner;
  creds?: ApiKeyCreds;
  funderAddress?: string;
  signatureType?: SignatureTypeV2;
};

/** 统一创建 Polymarket CLOB V2 客户端（Deposit Wallet type 3 为当前默认） */
export function createClobClient({
  signer,
  creds,
  funderAddress,
  signatureType = SignatureTypeV2.POLY_1271,
}: CreateClobClientParams): ClobClient {
  const builderCode = getPublicBuilderCode();

  return new ClobClient({
    host: CLOB_API_URL,
    chain: Chain.POLYGON,
    signer: signer as never,
    creds,
    signatureType,
    funderAddress,
    builderConfig: builderCode ? { builderCode } : undefined,
  });
}
