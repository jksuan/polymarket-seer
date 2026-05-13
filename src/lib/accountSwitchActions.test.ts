import { describe, expect, it, vi } from "vitest";
import { reloginWithNewAccount } from "./accountSwitchActions";

describe("reloginWithNewAccount", () => {
  it("应先 logout 再 login", async () => {
    const calls: string[] = [];
    const handleLogout = vi.fn(async () => {
      calls.push("logout");
    });
    const login = vi.fn(() => {
      calls.push("login");
    });

    await reloginWithNewAccount(handleLogout, login);

    expect(handleLogout).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["logout", "login"]);
  });
});
