import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api/validation";
import { prisma } from "@/lib/prisma";

const clientIdsSchema = z.array(z.string().trim().min(1)).max(10_000);

const createListSchema = z.object({
  name: z.string().trim().min(1, "Nom de liste requis").max(80),
  clientIds: clientIdsSchema.optional().default([]),
});

const updateListSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  addClientIds: clientIdsSchema.optional().default([]),
  removeClientIds: clientIdsSchema.optional().default([]),
});

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

async function getOwnedClientIds(merchantId: string, clientIds: string[]) {
  const ids = uniqueIds(clientIds);
  if (ids.length === 0) return [];

  const clients = await prisma.client.findMany({
    where: {
      id: { in: ids },
      cards: { some: { program: { merchantId } } },
    },
    select: { id: true },
  });

  return clients.map((client) => client.id);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const lists = await prisma.clientList.findMany({
    where: { merchantId: session.user.id },
    include: {
      members: {
        select: {
          clientId: true,
          client: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { members: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(lists);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, createListSchema);
  if (!parsed.ok) return parsed.response;

  const clientIds = uniqueIds(parsed.data.clientIds);
  const ownedClientIds = await getOwnedClientIds(session.user.id, clientIds);
  if (ownedClientIds.length !== clientIds.length) {
    return NextResponse.json(
      { error: "Un ou plusieurs clients ne vous appartiennent pas." },
      { status: 403 }
    );
  }

  const duplicate = await prisma.clientList.findUnique({
    where: {
      merchantId_name: {
        merchantId: session.user.id,
        name: parsed.data.name,
      },
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "Une liste porte déjà ce nom." },
      { status: 409 }
    );
  }

  try {
    const list = await prisma.clientList.create({
      data: {
        merchantId: session.user.id,
        name: parsed.data.name,
        ...(ownedClientIds.length > 0
          ? {
              members: {
                create: ownedClientIds.map((clientId) => ({ clientId })),
              },
            }
          : {}),
      },
      include: {
        members: { select: { clientId: true } },
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Une liste porte déjà ce nom." },
        { status: 409 }
      );
    }
    throw error;
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, updateListSchema);
  if (!parsed.ok) return parsed.response;

  const list = await prisma.clientList.findFirst({
    where: { id: parsed.data.id, merchantId: session.user.id },
    select: { id: true },
  });
  if (!list) {
    return NextResponse.json({ error: "Liste introuvable" }, { status: 404 });
  }

  const addClientIds = uniqueIds(parsed.data.addClientIds);
  const ownedClientIds = await getOwnedClientIds(session.user.id, addClientIds);
  if (ownedClientIds.length !== addClientIds.length) {
    return NextResponse.json(
      { error: "Un ou plusieurs clients ne vous appartiennent pas." },
      { status: 403 }
    );
  }

  try {
    const removeClientIds = uniqueIds(parsed.data.removeClientIds);
    await prisma.$transaction(async (tx) => {
      await tx.clientList.update({
        where: { id: list.id },
        data: parsed.data.name ? { name: parsed.data.name } : {},
      });
      if (removeClientIds.length > 0) {
        await tx.clientListMember.deleteMany({
          where: {
            listId: list.id,
            clientId: { in: removeClientIds },
          },
        });
      }
      if (ownedClientIds.length > 0) {
        await tx.clientListMember.createMany({
          data: ownedClientIds.map((clientId) => ({ listId: list.id, clientId })),
          skipDuplicates: true,
        });
      }
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Une liste porte déjà ce nom." },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Liste requise" }, { status: 400 });
  }

  const deleted = await prisma.clientList.deleteMany({
    where: { id, merchantId: session.user.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Liste introuvable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
