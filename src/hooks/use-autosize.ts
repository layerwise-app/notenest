import { useEffect, useLayoutEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Grows a textarea to fit its content so the surrounding pane scrolls as one
 * page. Keeps the pane's scroll position while the height is re-measured.
 */
export function useAutosize(ref: RefObject<HTMLTextAreaElement | null>, value: string, key?: unknown) {
  useLayoutEffect(() => {
    if (ref.current) fit(ref.current);
  }, [ref, value, key]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      fit(element);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
}

function fit(element: HTMLTextAreaElement) {
  const scroller = element.closest<HTMLElement>('[data-scroll-root]');
  const scrollTop = scroller?.scrollTop ?? 0;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
  if (scroller) scroller.scrollTop = scrollTop;
}
