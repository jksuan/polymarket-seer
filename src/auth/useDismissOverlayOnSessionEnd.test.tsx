import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDismissOverlayOnSessionEnd } from "./useSessionOverlays";

function SessionDismissProbe({
  isOpen,
  sessionEpoch,
  onDismiss,
}: {
  isOpen: boolean;
  sessionEpoch: number;
  onDismiss: () => void;
}) {
  useDismissOverlayOnSessionEnd(isOpen, sessionEpoch, onDismiss);
  return null;
}

describe("useDismissOverlayOnSessionEnd", () => {
  it("打开后 sessionEpoch 递增时调用 onDismiss", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <SessionDismissProbe isOpen sessionEpoch={1} onDismiss={onDismiss} />
    );

    expect(onDismiss).not.toHaveBeenCalled();

    rerender(<SessionDismissProbe isOpen sessionEpoch={2} onDismiss={onDismiss} />);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("同一 epoch 内不重复 dismiss", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <SessionDismissProbe isOpen sessionEpoch={1} onDismiss={onDismiss} />
    );

    rerender(<SessionDismissProbe isOpen sessionEpoch={1} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
