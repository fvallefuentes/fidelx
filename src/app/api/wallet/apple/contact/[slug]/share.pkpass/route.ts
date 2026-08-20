import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateContactApplePass } from "@/lib/wallet/contact-apple";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const card = await prisma.contactCard.findUnique({
    where: { slug },
    select: { isActive: true },
  });
  if (!card?.isActive) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  const pass = await generateContactApplePass(slug, "share");
  if (!pass) {
    return NextResponse.json({ error: "Pass indisponible" }, { status: 404 });
  }

  if (!process.env.APPLE_PASS_TYPE_ID) {
    return NextResponse.json(JSON.parse(pass.toString()), {
      headers: { "X-Dev-Mode": "true" },
    });
  }

  return new NextResponse(new Uint8Array(pass), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Length": String(pass.length),
      "Content-Disposition": `attachment; filename="${slug}-partage.pkpass"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
