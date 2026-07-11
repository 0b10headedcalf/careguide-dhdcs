"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdvancedMarker,
  Map as GoogleMap,
  InfoWindow,
  useMapsLibrary
} from "@vis.gl/react-google-maps";
import { useGeocoder } from "@/lib/coverage/geocode";

export interface NearbyResource {
  id: string;
  name: string;
  address: string;
  phone?: string;
  location: { lat: number; lng: number };
}

// Place types that plausibly help with healthcare coverage / enrollment.
// Places API (New) only allows one primary-type filter cleanly, so we search a
// couple of relevant ones and merge, deduping by place id.
const RESOURCE_TYPES = ["local_government_office", "hospital"] as const;
const SEARCH_RADIUS_METERS = 8000;

const DEFAULT_CENTER = { lat: 37.8044, lng: -122.2712 }; // Oakland, CA fallback

export function NearbyResourcesMap({ zip }: { zip: string }) {
  const geocode = useGeocoder();
  const placesLib = useMapsLibrary("places");

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [resources, setResources] = useState<NearbyResource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");

  const search = useCallback(async () => {
    if (!geocode || !placesLib || !zip.trim()) return;
    setStatus("loading");
    setResources([]);
    setSelectedId(null);

    const geo = await geocode(zip);
    if (!geo) {
      setStatus("error");
      return;
    }
    setCenter({ lat: geo.lat, lng: geo.lng });

    try {
      const merged = new Map<string, NearbyResource>();
      for (const type of RESOURCE_TYPES) {
        const { places } = await placesLib.Place.searchNearby({
          fields: ["id", "displayName", "formattedAddress", "location", "nationalPhoneNumber"],
          locationRestriction: { center: { lat: geo.lat, lng: geo.lng }, radius: SEARCH_RADIUS_METERS },
          includedPrimaryTypes: [type],
          maxResultCount: 8
        });

        for (const place of places) {
          if (!place.id || !place.location || merged.has(place.id)) continue;
          merged.set(place.id, {
            id: place.id,
            name: place.displayName ?? "Unnamed location",
            address: place.formattedAddress ?? "",
            phone: place.nationalPhoneNumber ?? undefined,
            location: { lat: place.location.lat(), lng: place.location.lng() }
          });
        }
      }

      const list = [...merged.values()];
      setResources(list);
      setStatus(list.length ? "idle" : "empty");
    } catch {
      setStatus("error");
    }
  }, [geocode, placesLib, zip]);

  // Re-run whenever the libraries finish loading or the ZIP changes and we're primed.
  useEffect(() => {
    if (zip.trim() && geocode && placesLib) {
      void search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocode, placesLib]);

  const ready = Boolean(geocode && placesLib);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => void search()}
        disabled={!ready || status === "loading"}
        className="min-h-12 w-full rounded-xl bg-primary px-5 font-extrabold text-white disabled:opacity-60"
      >
        {status === "loading" ? "Searching nearby…" : "Search verified resources"}
      </button>

      {status === "error" ? (
        <p className="text-sm font-semibold text-navy">
          We couldn&apos;t find that ZIP. Check the digits and try again.
        </p>
      ) : null}
      {status === "empty" ? (
        <p className="text-sm font-semibold text-navy">
          No public offices or hospitals found within {SEARCH_RADIUS_METERS / 1000} km of that ZIP.
        </p>
      ) : null}

      <div className="h-80 overflow-hidden rounded-[20px] border border-[rgba(16,32,79,0.10)]">
        <GoogleMap
          center={center}
          defaultZoom={12}
          mapId="careguide-resources"
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: "100%", height: "100%" }}
        >
          {resources.map((r) => (
            <AdvancedMarker
              key={r.id}
              position={r.location}
              onClick={() => setSelectedId(r.id)}
            />
          ))}
          {selectedId
            ? (() => {
                const r = resources.find((x) => x.id === selectedId);
                if (!r) return null;
                return (
                  <InfoWindow position={r.location} onCloseClick={() => setSelectedId(null)}>
                    <div className="max-w-56 text-sm">
                      <p className="font-bold text-navy">{r.name}</p>
                      {r.address ? <p className="text-slatecare">{r.address}</p> : null}
                      {r.phone ? <p className="text-slatecare">{r.phone}</p> : null}
                    </div>
                  </InfoWindow>
                );
              })()
            : null}
        </GoogleMap>
      </div>

      {resources.length ? (
        <ul className="space-y-3">
          {resources.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-[rgba(16,32,79,0.10)] bg-white p-4"
            >
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className="text-left"
              >
                <p className="font-extrabold text-navy">{r.name}</p>
                {r.address ? <p className="text-sm text-slatecare">{r.address}</p> : null}
                {r.phone ? <p className="text-sm text-slatecare">{r.phone}</p> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
