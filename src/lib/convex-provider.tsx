'use client';

import { ReactNode, useState } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

let convex: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convex) {
    convex = new ConvexReactClient(convexUrl);
  }
  return convex;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => getConvexClient());

  if (!convexUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-destructive mb-2">
            Configuration Error
          </h1>
          <p className="text-muted-foreground">
            NEXT_PUBLIC_CONVEX_URL is not set. Please configure your Convex
            environment.
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
