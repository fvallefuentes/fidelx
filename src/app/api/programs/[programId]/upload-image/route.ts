import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  processLogo,
  processLogoNoTrim,
  processStrip,
  processIcon,
  validateImageBuffer,
} from "@/lib/wallet/image-processing";
import { putBlob, keyForProgram, type CardAsset } from "@/lib/blob-store";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: CardAsset[] = ["logo", "strip", "icon"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { programId } = await params;
    const program = await prisma.loyaltyProgram.findUnique({
      where: { id: programId },
    });
    if (!program || program.merchantId !== session.user.id) {
      return NextResponse.json(
        { error: "Programme introuvable" },
        { status: 404 }
      );
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const typeRaw = form.get("type");
    const skipTrim = form.get("skipTrim") === "true";

    if (!file || !typeRaw) {
      return NextResponse.json(
        { error: "Champs file et type requis" },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(typeRaw as CardAsset)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }
    const type = typeRaw as CardAsset;

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 5 Mo)" },
        { status: 400 }
      );
    }

    const input = Buffer.from(await file.arrayBuffer());
    if (!(await validateImageBuffer(input))) {
      return NextResponse.json(
        { error: "Format d'image invalide" },
        { status: 400 }
      );
    }

    let processed: Buffer;
    let updateField: "logoBlobKey" | "stripBlobKey" | "iconBlobKey";
    switch (type) {
      case "logo":
        processed = skipTrim
          ? await processLogoNoTrim(input)
          : await processLogo(input);
        updateField = "logoBlobKey";
        break;
      case "strip":
        processed = await processStrip(input);
        updateField = "stripBlobKey";
        break;
      case "icon":
        processed = await processIcon(input);
        updateField = "iconBlobKey";
        break;
    }

    const key = keyForProgram(programId, type);
    await putBlob(key, processed);

    const updateData: Record<string, string> = { [updateField]: key };

    if (type === "logo") {
      const iconBuf = await processIcon(input);
      const iconKey = keyForProgram(programId, "icon");
      await putBlob(iconKey, iconBuf);
      updateData.iconBlobKey = iconKey;
    }

    await prisma.loyaltyProgram.update({
      where: { id: programId },
      data: updateData,
    });

    return NextResponse.json({ ok: true, key });
  } catch (err) {
    console.error("upload-image error:", err);
    return NextResponse.json(
      { error: "Erreur lors du traitement de l'image" },
      { status: 500 }
    );
  }
}
