"use client";

import { useEffect } from "react";

/**
 * 抽屉 / 全屏层打开时锁住背后页面滚动。
 * 仅设置 overflow:hidden 在部分移动浏览器上仍会滚动链传递或触发下拉刷新；
 * 配合 position:fixed 冻结视口在 iOS Safari 上更可靠。
 */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return undefined;

    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;

    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
