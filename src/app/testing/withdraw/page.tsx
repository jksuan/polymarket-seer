"use client";

import { useState } from "react";
import { WithdrawFormStep } from "@/components/ui/withdraw/WithdrawFormStep";
import { useWithdrawTestHarness } from "./useWithdrawTestHarness";

export default function WithdrawTestPage() {
  const [entered, setEntered] = useState(false);
  const c = useWithdrawTestHarness();

  return (
    <main className="space-y-4 bg-[#0D0518] p-6 text-white">
      <h1 className="text-xl font-bold">Withdraw E2E Fixture</h1>
      {!entered ? (
        <button
          type="button"
          data-testid="enter-withdraw-fixture"
          onClick={() => setEntered(true)}
          className="rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold"
        >
          Open withdraw form
        </button>
      ) : null}

      {entered ? (
        <div className="max-w-md">
          <WithdrawFormStep c={c as never} />
          <button
            type="button"
            data-testid="refresh-quote"
            onClick={c.refreshQuote}
            className="mt-3 rounded-md border border-white/20 px-3 py-2 text-xs"
          >
            Mock quote refresh
          </button>
        </div>
      ) : null}
    </main>
  );
}
