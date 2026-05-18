import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nContext } from "@/i18n";
import zh from "@/i18n/locales/zh";
import { HomeStep } from "./HomeStep";

function renderHomeZh() {
  return render(
    <I18nContext.Provider value={{ locale: "zh", setLocale: vi.fn(), t: zh }}>
      <HomeStep
        showConnectedWalletOption
        walletLabel="钱包 (0xabcd…1234)"
        walletUsdLoading={false}
        walletUsd={10}
        onWallet={vi.fn()}
        onTransfer={vi.fn()}
      />
    </I18nContext.Provider>
  );
}

describe("HomeStep", () => {
  it("中文文案使用 i18n 的充值流程词条", () => {
    renderHomeZh();

    expect(screen.getByText("加密货币")).toBeInTheDocument();
    expect(screen.getByText("银行")).toBeInTheDocument();
    expect(screen.getByText("即将上线")).toBeInTheDocument();
    expect(screen.getByText("已连接钱包")).toBeInTheDocument();
    expect(screen.getByText("其他方式")).toBeInTheDocument();
    expect(screen.getByText("链上转入")).toBeInTheDocument();
    expect(screen.getByText("交易所")).toBeInTheDocument();
  });
});
