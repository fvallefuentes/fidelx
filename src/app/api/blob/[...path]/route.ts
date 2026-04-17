import { NextRequest, NextResponse } from "next/server";
import { getBlob } from "@/lib/blob-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join("/");
  const data = await getBlob(key);
  if (!data) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
