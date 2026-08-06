import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildSwissAddressSearchUrl,
  normalizeSwissAddressResults,
} from "@/lib/swiss-geocoding";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 160) {
    return NextResponse.json(
      { error: "Saisissez une adresse d'au moins 3 caractères." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(buildSwissAddressSearchUrl(query), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "La recherche d'adresse est momentanément indisponible." },
        { status: 502 }
      );
    }

    const payload: unknown = await response.json();
    return NextResponse.json({ results: normalizeSwissAddressResults(payload) });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: timedOut
          ? "La recherche d'adresse a pris trop de temps. Réessayez."
          : "Impossible de rechercher cette adresse pour le moment.",
      },
      { status: timedOut ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
