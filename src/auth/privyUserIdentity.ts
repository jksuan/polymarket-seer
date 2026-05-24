import { shortenAddress } from "@/lib/utils";

import type { AuthSessionMode } from "./sessionMode";

/** Privy `user` 上与登录身份相关的 linked-account 字段（与 Dashboard loginMethods 对齐） */
export type PrivyUserLike = {
  email?: { address?: string | null } | null;
  google?: { email?: string | null } | null;
  twitter?: {
    username?: string | null;
    subject?: string | null;
    profilePictureUrl?: string | null;
  } | null;
  github?: {
    username?: string | null;
    subject?: string | null;
    email?: string | null;
  } | null;
  telegram?: {
    username?: string | null;
    subject?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export type AuthDisplayIdentity = {
  identifier: string;
  avatarUrl: string;
};

function dicebearAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed || "default")}`;
}

/** 是否已链接 embedded 路线身份（邮箱 / OAuth 社交），用于 sessionMode 推断 */
export function hasEmbeddedLinkedIdentity(user: unknown): boolean {
  const identity = user as PrivyUserLike | null | undefined;
  return Boolean(
    identity?.email?.address ||
      identity?.google?.email ||
      identity?.twitter?.username ||
      identity?.twitter?.subject ||
      identity?.github?.username ||
      identity?.github?.subject ||
      identity?.github?.email ||
      identity?.telegram?.username ||
      identity?.telegram?.subject
  );
}

function resolveSocialDisplayIdentity(user: unknown): AuthDisplayIdentity | null {
  const identity = user as PrivyUserLike | null | undefined;
  if (!identity) return null;

  if (identity.twitter?.username) {
    const handle = identity.twitter.username;
    return {
      identifier: `@${handle}`,
      avatarUrl: identity.twitter.profilePictureUrl || dicebearAvatar(handle),
    };
  }

  if (identity.google?.email) {
    return {
      identifier: identity.google.email,
      avatarUrl: dicebearAvatar(identity.google.email),
    };
  }

  if (identity.email?.address) {
    return {
      identifier: identity.email.address,
      avatarUrl: dicebearAvatar(identity.email.address),
    };
  }

  if (identity.github?.username) {
    const handle = identity.github.username;
    return {
      identifier: `@${handle}`,
      avatarUrl: dicebearAvatar(handle),
    };
  }

  if (identity.github?.email) {
    return {
      identifier: identity.github.email,
      avatarUrl: dicebearAvatar(identity.github.email),
    };
  }

  if (identity.telegram?.username) {
    const handle = identity.telegram.username;
    return {
      identifier: `@${handle}`,
      avatarUrl: dicebearAvatar(handle),
    };
  }

  const telegramName = [identity.telegram?.firstName, identity.telegram?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (telegramName) {
    return {
      identifier: telegramName,
      avatarUrl: dicebearAvatar(telegramName),
    };
  }

  return null;
}

/**
 * 顶栏 / 设置等处的登录展示名与头像。
 * external 会话优先外链地址；embedded 优先社交/邮箱身份。
 */
export function resolveAuthDisplayIdentity(
  user: unknown,
  options: {
    sessionMode: AuthSessionMode | null;
    walletAddress?: string;
  }
): AuthDisplayIdentity {
  const { sessionMode, walletAddress = "" } = options;

  if (sessionMode === "external" && walletAddress) {
    return {
      identifier: shortenAddress(walletAddress),
      avatarUrl: dicebearAvatar(walletAddress),
    };
  }

  const social = resolveSocialDisplayIdentity(user);
  if (social) return social;

  if (walletAddress) {
    return {
      identifier: shortenAddress(walletAddress),
      avatarUrl: dicebearAvatar(walletAddress),
    };
  }

  return {
    identifier: "Wallet Connected",
    avatarUrl: dicebearAvatar("default"),
  };
}

/** Connected 充值 / 提现「使用已连接钱包」：仅 external 会话展示（ADR-0005 §8） */
export function shouldOfferConnectedWalletFunds(
  sessionMode: AuthSessionMode | null,
  walletAddress: string | null | undefined
): boolean {
  return sessionMode === "external" && Boolean(walletAddress);
}
