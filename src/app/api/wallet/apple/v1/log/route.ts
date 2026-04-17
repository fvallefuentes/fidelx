import { NextResponse } from "next/server";

// POST — Apple Wallet envoie des logs d'erreurs ici
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  console.error("[Apple Wallet log]", JSON.stringify(body));
  return new NextResponse(null, { status: 200 });
}
