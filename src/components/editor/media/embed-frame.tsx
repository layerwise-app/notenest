// The iframe for embed blocks and for video links from YouTube, Vimeo, or Loom.
import { useState } from 'react';
import { HeightHandle } from './parts';
import type { EmbedTarget } from './urls';

// Pages on this origin would run with the app's own privileges inside the frame.
export function isSameOrigin(src: string) {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(src).origin === window.location.origin;
  } catch {
    return true;
  }
}

type EmbedFrameProps = {
  target: EmbedTarget;
  title: string;
  /** Stored height; null uses the provider's default. */
  height?: number | null;
  /** Present when the height can be dragged. */
  onHeight?: (height: number) => void;
};

export function EmbedFrame({ target, title, height = null, onHeight }: EmbedFrameProps) {
  const [liveHeight, setLiveHeight] = useState<number | null>(null);
  const shown = liveHeight ?? height ?? target.height;
  return (
    <>
      <iframe
        className='media-iframe'
        src={target.src}
        title={title}
        style={target.aspectRatio ? { aspectRatio: String(target.aspectRatio) } : { height: `${shown}px` }}
        sandbox='allow-scripts allow-same-origin allow-popups allow-forms allow-presentation'
        allow='fullscreen; picture-in-picture; encrypted-media'
        allowFullScreen
        loading='lazy'
        // YouTube refuses to play without a referrer.
        referrerPolicy='strict-origin-when-cross-origin'
      />
      {onHeight && !target.aspectRatio && <HeightHandle height={shown} onPreview={setLiveHeight} onCommit={onHeight} />}
    </>
  );
}
