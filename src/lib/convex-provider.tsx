'use client';

import { ReactNode, useState } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || '';

let convex: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convex && convexUrl) {
    convex = new ConvexReactClient(convexUrl);
  }
  return convex;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => getConvexClient());

  // During build time or when Convex URL is not configured, show children without provider
  // This allows the build to complete successfully
  if (!convexUrl) {
    return <>{children}</>;
  }

  return <ConvexProvider client={client!}>{children}</ConvexProvider>;
}
