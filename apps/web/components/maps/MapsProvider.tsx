"use client";

import { APIProvider } from "@vis.gl/react-google-maps";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Wraps children in the Google Maps JS API context.
 * If no key is configured we render children untouched so the app still works
 * without maps (the map/autocomplete components degrade to inert fallbacks).
 */
export function MapsProvider({ children }: { children: React.ReactNode }) {
  if (!MAPS_API_KEY) {
    return <>{children}</>;
  }

  return (
    <APIProvider apiKey={MAPS_API_KEY} libraries={["places", "geocoding", "marker"]}>
      {children}
    </APIProvider>
  );
}
