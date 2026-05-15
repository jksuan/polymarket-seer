import { describe, expect, it } from "vitest";
import {
  resolveOverlayOpen,
  shouldDismissOverlayForSessionEpoch,
} from "./sessionOverlays";

describe("sessionOverlays", () => {
  describe("resolveOverlayOpen", () => {
    it("本地打开且已登录时为可见", () => {
      expect(resolveOverlayOpen(true, true)).toBe(true);
    });

    it("未登录时强制不可见", () => {
      expect(resolveOverlayOpen(true, false)).toBe(false);
      expect(resolveOverlayOpen(false, false)).toBe(false);
    });
  });

  describe("shouldDismissOverlayForSessionEpoch", () => {
    it("未打开或未记录打开时 epoch 时不应关闭", () => {
      expect(shouldDismissOverlayForSessionEpoch(null, 2, false)).toBe(false);
      expect(shouldDismissOverlayForSessionEpoch(1, 2, false)).toBe(false);
    });

    it("打开后 sessionEpoch 变化时应关闭", () => {
      expect(shouldDismissOverlayForSessionEpoch(1, 2, true)).toBe(true);
    });

    it("同一 epoch 内保持打开", () => {
      expect(shouldDismissOverlayForSessionEpoch(2, 2, true)).toBe(false);
    });
  });
});
