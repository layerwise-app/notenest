// Positions a fixed menu next to a rectangle (the caret or a block) and keeps
// it on screen.
import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom';
import type { Placement } from '@floating-ui/dom';
import { useLayoutEffect, useRef } from 'react';

export function useFloating<T extends HTMLElement>(
  getRect: (() => DOMRect | null) | null,
  { placement = 'bottom-start', gap = 6, enabled = true }: { placement?: Placement; gap?: number; enabled?: boolean } = {}
) {
  const ref = useRef<T>(null);
  const rectRef = useRef(getRect);
  rectRef.current = getRect;

  useLayoutEffect(() => {
    const floating = ref.current;
    if (!floating || !enabled) return;
    const reference = {
      getBoundingClientRect: () => rectRef.current?.() ?? new DOMRect(-9999, -9999, 0, 0)
    };
    const update = () =>
      void computePosition(reference, floating, {
        strategy: 'fixed',
        placement,
        middleware: [
          offset(gap),
          flip({ padding: 8 }),
          shift({ padding: 8 }),
          size({
            padding: 8,
            apply({ availableHeight }) {
              floating.style.maxHeight = `${Math.max(160, Math.min(availableHeight, 440))}px`;
            }
          })
        ]
      }).then(({ x, y }) => {
        floating.style.left = `${x}px`;
        floating.style.top = `${y}px`;
        floating.style.visibility = 'visible';
      });
    return autoUpdate(reference, floating, update, { animationFrame: false });
  }, [enabled, placement, gap]);

  return ref;
}
