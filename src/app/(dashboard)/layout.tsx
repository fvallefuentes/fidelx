"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="dx-loading">
        <div className="dx-spinner" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="dashboard">
      <div className="dx-shell">
        <Sidebar />
        <div className="dx-main">
          <Header />
          <main className="dx-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
