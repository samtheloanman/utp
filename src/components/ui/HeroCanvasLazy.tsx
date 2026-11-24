'use client';

import dynamic from 'next/dynamic';

/** Loads the three.js hero only in the browser, after the page is interactive, so it stays out of the first-load bundle. */
export const HeroCanvasLazy = dynamic(() => import('./HeroCanvas').then((m) => m.HeroCanvas), {
  ssr: false,
  loading: () => null,
});
