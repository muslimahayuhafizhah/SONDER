"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function CreatorProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [creator, setCreator] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
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

        const res = await fetch(`/api/creators?id=${id}`, {
          cache: "no-store",
        });
        const result = await res.json();

        if (!res.ok || !result.success) {
          throw new Error(result.message || "Kreator tidak ditemukan.");
        }

        if (active) {
          setCreator(result.data.creator);
          setArtworks(result.data.artworks || []);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) loadProfile();

    return () => {
      active = false;
    };
  }, [id, router]);

  if (loading || !accessGranted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFE7] text-[#77796B]">
        Memuat profil kreator...
      </main>
    );
  }

  if (error || !creator) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F3EFE7] px-6 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-[#B87559]">
          CREATOR NOT FOUND
        </p>
        <h1 className="mt-3 font-serif text-3xl">{error || "Kreator tidak ditemukan"}</h1>
        <Link
          href="/explore"
          className="mt-6 text-sm underline underline-offset-4"
        >
          Kembali ke Explore
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <section className="border-b border-[#DED4C5] px-6 py-16 md:px-12 md:py-20">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/creators"
            className="text-xs uppercase tracking-widest text-[#77796B] hover:text-[#B87559]"
          >
            ← Daftar Kreator
          </Link>

          <div className="mt-10 flex flex-col items-start gap-8 md:flex-row md:items-center">
            {creator.profile_image ? (
              <img
                src={creator.profile_image}
                alt={creator.username}
                className="h-28 w-28 rounded-full border border-[#DED4C5] object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#DED4C5] font-serif text-4xl text-[#34312E]">
                {creator.username?.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.25em] text-[#B87559]">
                CREATOR PROFILE
              </p>

              <h1 className="mt-3 font-serif text-4xl md:text-5xl">
                {creator.username}
              </h1>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#77796B]">
                {creator.bio || "Kreator ini belum menambahkan deskripsi bio."}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-6 text-xs text-[#77796B]">
                <span>
                  Bergabung{" "}
                  {new Date(creator.created_at).toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>

                <span>{artworks.length} Karya Terpublikasi</span>

                {creator.external_link && (
                  <a
                    href={creator.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#B87559] underline underline-offset-4"
                  >
                    Tautan Eksternal / Portofolio ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:px-12">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#B87559]">
              CREATOR GALLERY
            </p>
            <h2 className="mt-2 font-serif text-3xl">
              Galeri Karya {creator.username}
            </h2>
          </div>

          <span className="text-xs text-[#77796B]">
            {artworks.length} karya
          </span>
        </div>

        {artworks.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#77796B]">
            Kreator ini belum mengunggah karya.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork) => (
              <Link
                key={artwork.artwork_id}
                href={`/artwork/${artwork.artwork_id}`}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-[#DED4C5]">
                  <img
                    src={artwork.image_url}
                    alt={artwork.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute bottom-4 left-4 bg-[#F3EFE7] px-3 py-1.5 text-[10px] uppercase tracking-wider">
                    {artwork.category_name}
                  </span>
                </div>

                <div className="mt-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-serif text-xl group-hover:text-[#B87559]">
                      {artwork.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#77796B]">
                      ♡ {artwork.total_likes || 0} suka
                    </p>
                  </div>
                  <span className="text-lg text-[#B87559]">↗</span>
                </div>
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
