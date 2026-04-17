import { getStore } from "@netlify/blobs";

const STORE_NAME = "card-assets";

function store() {
  return getStore(STORE_NAME);
}

export async function putBlob(key: string, data: Buffer): Promise<void> {
  const ab = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  await store().set(key, ab);
}

export async function getBlob(key: string): Promise<Buffer | null> {
  const data = await store().get(key, { type: "arrayBuffer" });
  if (!data) return null;
  return Buffer.from(data as ArrayBuffer);
}

export async function deleteBlob(key: string): Promise<void> {
  await store().delete(key);
}

export type CardAsset = "logo" | "strip" | "icon";

export function keyForProgram(programId: string, asset: CardAsset): string {
  return `program-${programId}/${asset}.png`;
}
