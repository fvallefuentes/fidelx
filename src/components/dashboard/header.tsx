"use client";

import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Bonjour, {session?.user?.name || "Commerçant"}
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant={session?.user?.plan === "FREE" ? "secondary" : "default"}>
          {session?.user?.plan || "FREE"}
        </Badge>
      </div>
    </header>
  );
}
