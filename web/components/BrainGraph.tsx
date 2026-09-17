'use client';

import ForceGraph2D from 'react-force-graph-2d';
import type { MutableRefObject } from 'react';

// Thin wrapper so the parent can hold a ref to the force-graph instance.
// next/dynamic doesn't forward the special `ref`, so we pass it as a normal
// `innerRef` prop and attach it here. This file is only ever imported via
// dynamic({ ssr: false }), so react-force-graph's window access is safe.
export default function BrainGraph({ innerRef, ...props }: { innerRef?: MutableRefObject<any> } & Record<string, unknown>) {
  return <ForceGraph2D ref={innerRef} {...props} />;
}
