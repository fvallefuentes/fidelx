import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type BackField = { label: string; value: string };

function isBackFieldArray(x: unknown): x is BackField[] {
  return (
    Array.isArray(x) &&
    x.every(
      (f) =>
        f &&
        typeof f === "object" &&
        typeof (f as BackField).label === "string" &&
        typeof (f as BackField).value === "string"
    )
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { programId } = await params;
  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
    include: {
      rewards: true,
      establishment: true,
      merchant: { select: { name: true, email: true } },
    },
  });

  if (!program || program.merchantId !== session.user.id) {
    return NextResponse.json(
      { error: "Programme introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json(program);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { programId } = await params;
  const existing = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
  });
  if (!existing || existing.merchantId !== session.user.id) {
    return NextResponse.json(
      { error: "Programme introuvable" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const {
    name,
    templateId,
    stripBlobKey,
    backFields,
    cardDesign,
  } = body as Record<string, unknown>;

  const data: Prisma.LoyaltyProgramUpdateInput = {};

  if (typeof name === "string" && name.trim()) {
    data.name = name.trim();
  }
  if (typeof templateId === "string") {
    data.templateId = templateId;
  }
  if (stripBlobKey === null) {
    data.stripBlobKey = null;
  } else if (typeof stripBlobKey === "string") {
    data.stripBlobKey = stripBlobKey;
  }
  if (backFields === null) {
    data.backFields = Prisma.JsonNull;
  } else if (isBackFieldArray(backFields)) {
    data.backFields = backFields as unknown as Prisma.InputJsonValue;
  } else if (backFields !== undefined) {
    return NextResponse.json(
      { error: "backFields invalide" },
      { status: 400 }
    );
  }
  if (cardDesign && typeof cardDesign === "object") {
    data.cardDesign = cardDesign as Prisma.InputJsonValue;
  }

  const updated = await prisma.loyaltyProgram.update({
    where: { id: programId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { programId } = await params;
  const existing = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
  });
  if (!existing || existing.merchantId !== session.user.id) {
    return NextResponse.json(
      { error: "Programme introuvable" },
      { status: 404 }
    );
  }

  await prisma.loyaltyProgram.delete({ where: { id: programId } });
  return NextResponse.json({ ok: true });
}
