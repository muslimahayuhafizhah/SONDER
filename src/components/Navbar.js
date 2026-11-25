"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!active) return;

        if (response.ok && result.success) {
          setUser(result.data);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Gagal memeriksa login:", error);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    checkLogin();

    return () => {
      active = false;
    };
  }, [pathname]);

  async function handleLogout() {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
      });

      if (response.ok) {
        setUser(null);
        router.replace("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  }

  const isAdmin = user?.role === "admin";
  const isCurator = user?.role === "curator";
  const isCuratorApproved =
    isCurator && user?.curator_status === "approved";
  const isMember = user?.role === "member";
  const isGuest = !user;

  return (
    <nav className="border-b border-[#DED4C5] bg-[#F3EFE7] px-6 py-5 text-[#34312E] md:px-12">
      <div className="flex items-center justify-between">
        <Link
          href={
            isAdmin
              ? "/dashboard"
              : isCurator && !isCuratorApproved
              ? "/curator/pending"
              : "/"
          }
          className="font-serif text-2xl tracking-[0.18em]"
        >
          SONDER<span className="text-[#B87559]">.</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm md:flex">
          {!loading && !isAdmin && !(isCurator && !isCuratorApproved) && (
            <>
              <Link href="/" className="hover:text-[#B87559]">
                Home
              </Link>

              {(isMember || isCuratorApproved) && (
                <>
                  <Link href="/explore" className="hover:text-[#B87559]">
                    Explore
                  </Link>

                  <Link href="/challenges" className="hover:text-[#B87559]">
                    Challenges
                  </Link>

                  <Link href="/creators" className="hover:text-[#B87559]">
                    Creators
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm">
          {!loading && (
            <>
              {isGuest && (
                <>
                  <Link
                    href="/login"
                    className="border border-[#34312E] px-4 py-2 transition hover:bg-[#34312E] hover:text-[#F3EFE7]"
                  >
                    Masuk
                  </Link>

                  <Link
                    href="/register"
                    className="bg-[#34312E] px-4 py-2 text-[#F3EFE7] transition hover:bg-[#77796B]"
                  >
                    Daftar
                  </Link>
                </>
              )}

              {(isMember || isCurator || isAdmin) && (
                <>
                  <Link
                    href={
                      isCurator && !isCuratorApproved
                        ? "/curator/pending"
                        : "/dashboard"
                    }
                    className="border border-[#34312E] px-4 py-2 transition hover:bg-[#34312E] hover:text-[#F3EFE7]"
                  >
                    {isCurator && !isCuratorApproved
                      ? "Status Akun"
                      : "Dashboard"}
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="bg-[#34312E] px-4 py-2 text-[#F3EFE7] transition hover:bg-[#B87559]"
                  >
                    Keluar
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Menu Navigasi Mobile */}
      {!loading && (isMember || isCuratorApproved) && (
        <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-[#DED4C5] pt-3 text-xs uppercase tracking-widest md:hidden">
          <Link href="/" className="hover:text-[#B87559]">
            Home
          </Link>
          <Link href="/explore" className="hover:text-[#B87559]">
            Explore
          </Link>
          <Link href="/challenges" className="hover:text-[#B87559]">
            Challenges
          </Link>
          <Link href="/creators" className="hover:text-[#B87559]">
            Creators
          </Link>
        </div>
      )}
    </nav>
  );
}
