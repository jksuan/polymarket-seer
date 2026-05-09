import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLockBodyScroll } from "./useLockBodyScroll";

describe("useLockBodyScroll", () => {
  beforeEach(() => {
    document.documentElement.style.overflow = "";
    document.body.style.cssText = "";
    window.scrollTo(0, 0);
  });

  afterEach(() => {
    document.documentElement.style.overflow = "";
    document.body.style.cssText = "";
  });

  it("opens overlay lock with fixed body and restores on unmount", () => {
    const scrollYGetter = vi.spyOn(window, "scrollY", "get").mockReturnValue(200);
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    const { unmount } = renderHook(() => useLockBodyScroll(true));

    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-200px");
    expect(document.body.style.left).toBe("0px");
    expect(document.body.style.right).toBe("0px");
    expect(document.body.style.width).toBe("100%");

    unmount();

    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.position).toBe("");
    expect(scrollToSpy).toHaveBeenCalledWith(0, 200);

    scrollToSpy.mockRestore();
    scrollYGetter.mockRestore();
  });

  it("does not touch styles when locked is false", () => {
    renderHook(() => useLockBodyScroll(false));

    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.position).toBe("");
  });
});
