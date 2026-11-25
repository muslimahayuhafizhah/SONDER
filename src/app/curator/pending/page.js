"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PendingCuratorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkStatus() {
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

        if (currentUser.role !== "curator") {
          router.replace("/dashboard");
          return;
        }

        if (currentUser.curator_status === "approved") {
          router.replace("/dashboard");
          return;
        }

        if (active) {
          setUser(currentUser);
        }
      } catch {
        router.replace("/login");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkStatus();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    setProcessing(true);
    try {
      await fetch("/api/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Gagal keluar dari akun.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Yakin ingin menghapus akun Curator yang ditolak ini? Tindakan ini tidak dapat dibatalkan."
    );

    if (!confirmed) return;

    setProcessing(true);
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menghapus akun.");
      }

      router.replace("/register");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFE7] text-[#77796B]">
        Memeriksa status Curator...
      </main>
    );
  }

  const isRejected = user.curator_status === "rejected";

  return (
    <main className="flex min-h-screen flex-col justify-between bg-[#F3EFE7] text-[#34312E]">
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16 md:px-12">
        <div className="border border-[#DED4C5] bg-[#FCFAF6] p-8 md:p-14">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B87559]">
            {isRejected
              ? "CURATOR VERIFICATION · REJECTED"
              : "CURATOR VERIFICATION · PENDING"}
          </p>

          <h1 className="mt-5 font-serif text-4xl leading-tight md:text-5xl">
            {isRejected
              ? "Pendaftaran Curator Ditolak."
              : "Akun Anda sedang ditinjau."}
          </h1>

          <div className="my-7 h-px bg-[#DED4C5]" />

          {isRejected ? (
            <div className="space-y-4 text-sm leading-7 text-[#77796B]">
              <p>
                Halo <span className="font-medium text-[#34312E]">{user.username}</span>,
                terima kasih telah mengajukan pendaftaran sebagai Curator di SONDER.
              </p>
              <p>
                Setelah melalui proses peninjauan oleh Admin, pendaftaran akun Curator
                dengan email <span className="font-medium text-[#34312E]">{user.email}</span>{" "}
                belum dapat disetujui. Sesuai ketentuan platform, akun dengan status
                ditolak tidak dapat mengakses dashboard maupun fitur Curator, dan Anda
                dapat menghapus akun ini di bawah.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-sm leading-7 text-[#77796B]">
              <p>
                Halo <span className="font-medium text-[#34312E]">{user.username}</span>,
                akun Curator Anda saat ini masih menunggu persetujuan dari Admin SONDER.
              </p>
              <p>
                Selama akun Anda berstatus <span className="italic text-[#34312E]">Pending</span>,
                Anda belum dapat mengakses Dashboard Curator, Explore, maupun membuat
                Challenge. Silakan periksa kembali secara berkala.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-6 border-l-2 border-[#B87559] bg-[#B87559]/10 px-4 py-3 text-sm text-[#8B4935]">
              {error}
            </p>
          )}

          <div className="mt-9 flex flex-wrap items-center gap-4">
            {isRejected ? (
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={processing}
                className="bg-[#B87559] px-7 py-3.5 text-xs uppercase tracking-widest text-[#F3EFE7] transition hover:bg-[#9F6047] disabled:opacity-50"
              >
                {processing ? "MENGHAPUS AKUN..." : "Delete Account (Hapus Akun)"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => window.location.reload()}
                disabled={processing}
                className="bg-[#34312E] px-7 py-3.5 text-xs uppercase tracking-widest text-[#F3EFE7] transition hover:bg-[#77796B] disabled:opacity-50"
              >
                Periksa Ulang Status
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={processing}
              className="border border-[#34312E] px-7 py-3.5 text-xs uppercase tracking-widest text-[#34312E] transition hover:bg-[#34312E] hover:text-[#F3EFE7] disabled:opacity-50"
            >
              Keluar
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#DED4C5] px-6 py-8 text-center text-xs text-[#77796B]">
        <Link href="/" className="font-serif text-lg tracking-widest text-[#34312E]">
          SONDER<span className="text-[#B87559]">.</span>
        </Link>
        <p className="mt-2">Every Piece Has a Story.</p>
      </footer>
    </main>
  );
}
