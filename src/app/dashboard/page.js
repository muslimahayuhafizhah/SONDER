
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import MemberDashboard from "@/components/dashboard/MemberDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import CuratorDashboard from "@/components/dashboard/CuratorDashboard";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          router.replace("/login");
          return;
        }

        const currentUser = result.data;

        if (
          currentUser.role === "curator" &&
          currentUser.curator_status !== "approved"
        ) {
          router.replace("/curator/pending");
          return;
        }

        setUser(currentUser);
      } catch (error) {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-[#F3EFE7] flex items-center justify-center text-[#34312E]">
        Memuat dashboard...
      </main>
    );
  }

  if (user.role === "admin") {
    return <AdminDashboard user={user} />;
  }

  if (user.role === "member") {
    return <MemberDashboard user={user} />;
  }

  if (user.role === "curator") {
    return <CuratorDashboard user={user} />;
  }

  return null;
}
