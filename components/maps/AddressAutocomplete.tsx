"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

export interface SelectedAddress {
  formatted: string;
  zip?: string;
  location?: { lat: number; lng: number };
}

/**
 * A text input with Google Places address autocomplete.
 * Calls onSelect when the user picks a suggestion. Degrades to a plain input
 * (still editable) until the Places library loads.
 */
export function AddressAutocomplete({
  label,
  defaultValue = "",
  onSelect
}: {
  label: string;
  defaultValue?: string;
  onSelect: (address: SelectedAddress) => void;
}) {
  const placesLib = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    const ac = new placesLib.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "address_components", "geometry"],
      types: ["address"],
      componentRestrictions: { country: "us" }
    });
    setAutocomplete(ac);
  }, [placesLib]);

  useEffect(() => {
    if (!autocomplete) return;
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const zip = place.address_components?.find((c) => c.types.includes("postal_code"))
        ?.long_name;
      const loc = place.geometry?.location;
      onSelect({
        formatted: place.formatted_address ?? inputRef.current?.value ?? "",
        zip,
        location: loc ? { lat: loc.lat(), lng: loc.lng() } : undefined
      });
    });
    return () => listener.remove();
  }, [autocomplete, onSelect]);

  return (
    <label className="block">
      <span className="text-sm font-extrabold text-navy">{label}</span>
      <input
        ref={inputRef}
        defaultValue={defaultValue}
        placeholder="Start typing your address…"
        className="mt-2 min-h-12 w-full rounded-xl border border-[rgba(16,32,79,0.14)] bg-white px-4 text-base text-navy focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary"
      />
    </label>
  );
}
