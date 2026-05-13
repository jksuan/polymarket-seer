export async function reloginWithNewAccount(
  handleLogout: () => Promise<void>,
  login: () => void
): Promise<void> {
  await handleLogout();
  login();
}
