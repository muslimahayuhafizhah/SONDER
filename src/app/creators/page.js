"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreatorsPage() {
  const router = useRouter();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCreators() {
      try {
        const userRes = await fetch("/api/me", { cache: "no-store" });
        const userResult = await userRes.json();

        if (!userRes.ok || !userResult.success) {
          router.replace("/login");
          return;
        }

        const user = userResult.data;

        if (user.role === "admin") {
          router.replace("/dashboard");
          return;
        }

        if (user.role === "curator" && user.curator_status !== "approved") {
          router.replace("/curator/pending");
          return;
        }

        if (!["member", "curator"].includes(user.role)) {
          router.replace("/login");
          return;
        }

        if (!active) return;
        setAccessGranted(true);

        const res = await fetch("/api/creators", { cache: "no-store" });
        const result = await res.json();

        if (!res.ok || !result.success) {
          throw new Error(result.message || "Gagal mengambil daftar kreator.");
        }

        if (active) {
          setCreators(result.data || []);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCreators();

    return () => {
      active = false;
    };
  }, [router]);

  if (!accessGranted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFE7] text-[#77796B]">
        Memeriksa akses...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <section className="border-b border-[#DED4C5] px-6 py-20 md:px-12 md:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B87559]">
            THE CREATIVE MINDS
          </p>

          <h1 className="mt-6 font-serif text-5xl leading-tight md:text-7xl">
            Sosok di balik <em className="text-[#B87559]">setiap cerita.</em>
          </h1>

          <p className="mt-6 max-w-lg text-sm leading-7 text-[#77796B]">
            Kenali para kreator SONDER, eksplorasi sudut pandang mereka, dan
            temukan karya-karya yang mereka bagikan.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-12">
        {loading ? (
          <p className="py-16 text-center font-serif text-xl text-[#77796B]">
            Memuat daftar kreator...
          </p>
        ) : error ? (
          <p className="py-16 text-center text-sm text-[#B87559]">{error}</p>
        ) : creators.length === 0 ? (
          <p className="py-16 text-center font-serif text-xl text-[#77796B]">
            Belum ada kreator terdaftar.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((creator) => (
              <Link
                key={creator.user_id}
                href={`/creators/${creator.user_id}`}
                className="group flex flex-col justify-between border border-[#DED4C5] bg-[#FCFAF6] p-7 transition hover:border-[#B87559]"
              >
                <div>
                  <div className="flex items-center gap-4">
                    {creator.profile_image ? (
                      <img
                        src={creator.profile_image}
                        alt={creator.username}
                        className="h-14 w-14 rounded-full object-cover border border-[#DED4C5]"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DED4C5] font-serif text-xl text-[#34312E]">
                        {creator.username?.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <h2 className="font-serif text-2xl transition group-hover:text-[#B87559]">
                        {creator.username}
                      </h2>
                      <p className="text-xs uppercase tracking-widest text-[#77796B]">
                        {creator.total_artworks || 0} Karya
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-[#77796B]">
                    {creator.bio || "Kreator di komunitas seni digital SONDER."}
                  </p>
                </div>

                <p className="mt-6 text-xs uppercase tracking-widest text-[#B87559]">
                  Lihat Profil & Galeri →
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-[#DED4C5] px-6 py-8 text-center text-xs text-[#77796B]">
        SONDER — Every Piece Has a Story.
      </footer>
    </main>
  );
}
