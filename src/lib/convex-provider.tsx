'use client';

import { ReactNode, useMemo } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const client = useMemo(() => {
    if (!convexUrl) {
      return null;
    }
    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!convexUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-destructive mb-2">
            Configuration Error
          </h1>
          <p className="text-muted-foreground">
            NEXT_PUBLIC_CONVEX_URL is not set. Please configure your environment.
          </p>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
