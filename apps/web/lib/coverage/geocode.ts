"use client";

import { useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Human-readable address Google resolved the query to, e.g. "Oakland, CA 94601, USA". */
  formattedAddress: string;
}

/**
 * Returns a `geocode(query)` function that turns a ZIP (or any address string)
 * into coordinates using the Google Geocoding library.
 *
 * The library loads asynchronously — until it's ready, `geocode` is null.
 * Callers should guard: `if (!geocode) return;`
 */
export function useGeocoder(): ((query: string) => Promise<GeocodeResult | null>) | null {
  const geocodingLib = useMapsLibrary("geocoding");

  return useCallback(
    async (query: string): Promise<GeocodeResult | null> => {
      if (!geocodingLib) return null;
      if (!query.trim()) return null;
      const geocoder = new geocodingLib.Geocoder();

      try {
        const { results } = await geocoder.geocode({ address: query });
        const best = results[0];
        if (!best) return null;
        return {
          lat: best.geometry.location.lat(),
          lng: best.geometry.location.lng(),
          formattedAddress: best.formatted_address
        };
      } catch {
        // ZERO_RESULTS, network, quota, and referrer errors all reject here.
        // For a demo we collapse them into one "couldn't find it" signal.
        return null;
      }
    },
    [geocodingLib]
  );
}
