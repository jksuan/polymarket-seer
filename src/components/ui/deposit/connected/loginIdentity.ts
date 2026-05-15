type PrivyLoginIdentity = {
  email?: { address?: string | null } | null;
  google?: { email?: string | null } | null;
  twitter?: { username?: string | null; subject?: string | null } | null;
};

export function isEmailOrSocialLogin(user: unknown): boolean {
  const identity = user as PrivyLoginIdentity | null | undefined;
  return Boolean(
    identity?.email?.address ||
      identity?.google?.email ||
      identity?.twitter?.username ||
      identity?.twitter?.subject
  );
}
