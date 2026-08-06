"use client";

import { useState } from "react";
import { CheckCircle2, LocateFixed, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SwissAddressResult } from "@/lib/swiss-geocoding";

interface LocationValue {
  address: string;
  latitude: string;
  longitude: string;
}

interface LocationPickerProps extends LocationValue {
  name: string;
  onChange: (value: LocationValue) => void;
}

export function LocationPicker({
  name,
  address,
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const [results, setResults] = useState<SwissAddressResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const location = getValidMapLocation(latitude, longitude);

  async function searchAddress() {
    const query = address.trim();
    setError("");
    setSuccess("");
    setResults([]);

    if (query.length < 3) {
      setError("Saisissez une rue, un numéro et une ville.");
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/merchants/geocoding?q=${encodeURIComponent(query)}`);
      const data = (await response.json().catch(() => null)) as {
        results?: SwissAddressResult[];
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "Impossible de rechercher cette adresse.");
        return;
      }

      const nextResults = data?.results ?? [];
      setResults(nextResults);
      if (nextResults.length === 0) {
        setError("Aucune adresse trouvée. Ajoutez le numéro, le NPA ou la ville.");
      }
    } catch {
      setError("La recherche d'adresse est indisponible. Vérifiez votre connexion.");
    } finally {
      setSearching(false);
    }
  }

  function selectAddress(result: SwissAddressResult) {
    onChange({
      address: result.label,
      latitude: result.latitude.toFixed(6),
      longitude: result.longitude.toFixed(6),
    });
    setResults([]);
    setError("");
    setSuccess("Adresse trouvée. Vérifiez le repère sur la carte.");
  }

  async function locateCurrentPosition() {
    setError("");
    setSuccess("");

    if (!window.isSecureContext) {
      setError("La position fonctionne uniquement sur une connexion HTTPS sécurisée.");
      return;
    }
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }

    setLocating(true);
    try {
      let position: GeolocationPosition;
      try {
        position = await getBrowserPosition({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        });
      } catch (firstError) {
        if (getGeolocationErrorCode(firstError) === 1) throw firstError;
        position = await getBrowserPosition({
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000,
        });
      }

      onChange({
        address,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
      });
      setResults([]);
      setSuccess("Position détectée. Vérifiez le repère sur la carte.");
    } catch (positionError) {
      setError(getGeolocationErrorMessage(positionError));
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-900">
          Adresse du commerce
        </label>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Input
            value={address}
            onChange={(event) => {
              onChange({ address: event.target.value, latitude: "", longitude: "" });
              setResults([]);
              setError("");
              setSuccess("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchAddress();
              }
            }}
            placeholder="Rue de Carouge 10, 1205 Genève"
            autoComplete="street-address"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void searchAddress()}
            disabled={searching}
          >
            <Search className="mr-2 h-4 w-4" />
            {searching ? "Recherche..." : "Rechercher"}
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Recherchez l&apos;adresse puis choisissez le bon résultat.
        </p>
      </div>

      {results.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <p className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Adresses trouvées
          </p>
          <div className="divide-y divide-gray-100">
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => selectAddress(result)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-lime-50"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lime-700" />
                <span>{result.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void locateCurrentPosition()}
          disabled={locating}
        >
          <LocateFixed className="mr-2 h-4 w-4" />
          {locating ? "Localisation..." : "Utiliser ma position"}
        </Button>
        <span className="text-xs text-gray-500">Pratique si vous êtes dans le commerce.</span>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-lime-200 bg-lime-50 px-3 py-2 text-sm text-lime-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {location && (
        <LocationMap
          latitude={location.latitude}
          longitude={location.longitude}
          name={address || name || "Emplacement du commerce"}
        />
      )}

      <details className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Coordonnées avancées
        </summary>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Latitude</label>
            <Input
              type="number"
              step="any"
              min={-90}
              max={90}
              value={latitude}
              onChange={(event) => onChange({ address, latitude: event.target.value, longitude })}
              placeholder="46.204391"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Longitude</label>
            <Input
              type="number"
              step="any"
              min={-180}
              max={180}
              value={longitude}
              onChange={(event) => onChange({ address, latitude, longitude: event.target.value })}
              placeholder="6.143158"
            />
          </div>
        </div>
      </details>
    </div>
  );
}

export function LocationMap({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name: string;
}) {
  const query = `${latitude},${longitude}`;
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-gray-900">Emplacement sur la carte</p>
          <p className="text-xs text-gray-500">{name}</p>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm font-medium text-lime-700 hover:underline"
        >
          Ouvrir
        </a>
      </div>
      <iframe
        title={`Carte Google Maps - ${name}`}
        src={embedUrl}
        className="h-64 w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

function getValidMapLocation(latitudeValue: string, longitudeValue: string) {
  const latitude = parseCoordinate(latitudeValue);
  const longitude = parseCoordinate(longitudeValue);
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

function parseCoordinate(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function getBrowserPosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function getGeolocationErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return 0;
  const code = Number((error as { code?: unknown }).code);
  return Number.isFinite(code) ? code : 0;
}

function getGeolocationErrorMessage(error: unknown) {
  switch (getGeolocationErrorCode(error)) {
    case 1:
      return "L'accès à la position est bloqué. Dans Chrome, cliquez sur l'icône à gauche de l'adresse du site, autorisez Position, puis réessayez. Sous Windows, vérifiez aussi que les services de localisation sont activés.";
    case 2:
      return "Votre appareil ne parvient pas à déterminer sa position. Vérifiez que la localisation Windows est activée ou recherchez l'adresse ci-dessus.";
    case 3:
      return "La localisation a pris trop de temps. Rapprochez-vous d'une fenêtre, vérifiez la localisation Windows, puis réessayez.";
    default:
      return "Impossible de récupérer votre position. Recherchez l'adresse du commerce ci-dessus.";
  }
}
