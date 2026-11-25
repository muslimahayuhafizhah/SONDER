"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const teaserArtworks = [
  {
    number: "001",
    title: "The Quiet Between",
    artist: "Studio Arunika",
    category: "Ilustrasi Digital",
  },
  {
    number: "002",
    title: "Fragments of Home",
    artist: "Nadia Putri",
    category: "Fotografi",
  },
  {
    number: "003",
    title: "A Different Perspective",
    artist: "Raka Aditya",
    category: "Lukisan",
  },
];

const defaultCategories = [
  "Ilustrasi Digital",
  "Fotografi",
  "Lukisan",
  "Desain Grafis",
  "Media Campuran",
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [liveArtworks, setLiveArtworks] = useState([]);
  const [liveCategories, setLiveCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkUser() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
        });

        const result = await response.json();

        if (response.ok && result.success) {
          const currentUser = result.data;

          if (currentUser.role === "admin") {
            router.replace("/dashboard");
            return;
          }

          if (
            currentUser.role === "curator" &&
            currentUser.curator_status !== "approved"
          ) {
            router.replace("/curator/pending");
            return;
          }

          if (active) setUser(currentUser);

          if (
            currentUser.role === "member" ||
            (currentUser.role === "curator" &&
              currentUser.curator_status === "approved")
          ) {
            const [artRes, catRes] = await Promise.all([
              fetch("/api/artworks", { cache: "no-store" }),
              fetch("/api/categories", { cache: "no-store" }),
            ]);

            const [artData, catData] = await Promise.all([
              artRes.json(),
              catRes.json(),
            ]);

            if (active) {
              if (artRes.ok && artData.success) {
                setLiveArtworks((artData.data || []).slice(0, 6));
              }
              if (catRes.ok && catData.success) {
                setLiveCategories(catData.data || []);
              }
            }
          }
        } else if (active) {
          setUser(null);
        }
      } catch (error) {
        console.error("Gagal memeriksa pengguna:", error);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    checkUser();

    return () => {
      active = false;
    };
  }, [router]);

  if (
    loading ||
    user?.role === "admin" ||
    (user?.role === "curator" && user?.curator_status !== "approved")
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFE7] text-[#77796B]">
        Memuat SONDER...
      </main>
    );
  }

  const isGuest = !user;
  const isMember = user?.role === "member";
  const isCurator =
    user?.role === "curator" &&
    user?.curator_status === "approved";

  const canExplore = isMember || isCurator;

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      {/* PEMBUKA */}
      <section className="grid gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:px-12 md:py-24">
        <div>
          <p className="mb-6 text-xs tracking-[0.25em] text-[#77796B]">
            RUANG TERBUKA UNTUK PARA KREATOR
          </p>

          <h1 className="max-w-xl font-serif text-5xl leading-[1.12] md:text-7xl">
            Every piece
            <br />
            has a <span className="italic text-[#B87559]">story.</span>
          </h1>

          <p className="mt-7 max-w-md text-sm leading-7 text-[#77796B] md:text-base">
            Setiap kreator memiliki dunia dan perspektifnya sendiri.
            Temukan cerita, sudut pandang, dan emosi yang tersimpan
            di balik setiap karya seni.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            {canExplore ? (
              <Link
                href="/explore"
                className="bg-[#34312E] px-7 py-3 text-sm text-[#F3EFE7] transition hover:bg-[#77796B]"
              >
                Jelajahi Karya
              </Link>
            ) : (
              <Link
                href="/register"
                className="bg-[#34312E] px-7 py-3 text-sm text-[#F3EFE7] transition hover:bg-[#77796B]"
              >
                Bergabung dengan SONDER
              </Link>
            )}

            <a
              href="#about"
              className="text-sm underline underline-offset-4"
            >
              Tentang SONDER
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="flex aspect-[4/5] items-center justify-center bg-[#DED4C5]">
            <p className="font-serif text-2xl italic text-[#77796B]">
              A world within a frame.
            </p>
          </div>

          <p className="mt-4 text-right text-[10px] tracking-[0.2em] text-[#77796B]">
            KOLEKSI SONDER · NO. 001
          </p>
        </div>
      </section>

      {/* PREVIEW KARYA */}
      <section id="explore" className="px-6 py-16 md:px-12 md:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs tracking-[0.2em] text-[#B87559]">
              01 — PILIHAN KARYA
            </p>

            <h2 className="font-serif text-4xl md:text-5xl">
              {isGuest ? "Sekilas Karya" : "Karya Pilihan"}
            </h2>
          </div>

          {canExplore && (
            <Link
              href="/explore"
              className="text-sm underline underline-offset-4"
            >
              Lihat Semua Karya →
            </Link>
          )}
        </div>

        {canExplore && liveArtworks.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {liveArtworks.map((artwork, index) => {
              const artist =
                artwork.source_type === "curated"
                  ? artwork.artist_name
                  : artwork.member_username || artwork.username;

              return (
                <Link
                  key={artwork.artwork_id}
                  href={`/artwork/${artwork.artwork_id}`}
                  className="group block"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-[#DED4C5]">
                    <img
                      src={artwork.image_url}
                      alt={artwork.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="mt-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-serif text-xl group-hover:text-[#B87559]">
                        {artwork.title}
                      </h3>

                      <p className="mt-1 text-sm text-[#77796B]">
                        {artist || "Kreator SONDER"}
                      </p>

                      <p className="mt-2 text-xs text-[#B87559]">
                        {artwork.category_name} · ♡ {artwork.total_likes || 0}
                      </p>
                    </div>

                    <span className="text-xs text-[#77796B]">
                      00{index + 1}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {teaserArtworks.map((artwork) => (
              <article key={artwork.number} className="group">
                <div className="flex aspect-[4/5] items-center justify-center bg-[#DED4C5] transition group-hover:bg-[#D3C5B2]">
                  <span className="font-serif text-2xl italic text-[#77796B]">
                    Karya {artwork.number}
                  </span>
                </div>

                {!isGuest && (
                  <div className="mt-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-serif text-xl">
                        {artwork.title}
                      </h3>

                      <p className="mt-1 text-sm text-[#77796B]">
                        {artwork.artist}
                      </p>

                      <p className="mt-2 text-xs text-[#B87559]">
                        {artwork.category}
                      </p>
                    </div>

                    <span className="text-xs text-[#77796B]">
                      {artwork.number}
                    </span>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {isGuest && (
          <div className="mt-10 border-t border-[#DED4C5] pt-8 text-center">
            <p className="font-serif text-2xl">
              Ada lebih banyak cerita untuk ditemukan.
            </p>

            <p className="mt-3 text-sm text-[#77796B]">
              Bergabunglah untuk melihat seluruh karya dan mengenal
              para kreatornya.
            </p>

            <Link
              href="/register"
              className="mt-6 inline-block bg-[#34312E] px-7 py-3 text-sm text-[#F3EFE7] transition hover:bg-[#77796B]"
            >
              Daftar Sekarang
            </Link>
          </div>
        )}
      </section>

      {/* KATEGORI */}
      {canExplore && (
        <section
          id="categories"
          className="bg-[#DED4C5] px-6 py-16 md:px-12 md:py-24"
        >
          <p className="mb-3 text-xs tracking-[0.2em] text-[#B87559]">
            02 — TEMUKAN MINATMU
          </p>

          <h2 className="mb-10 font-serif text-4xl md:text-5xl">
            Jelajahi Kategori
          </h2>

          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
            {(liveCategories.length > 0
              ? liveCategories.map((c) => c.category_name)
              : defaultCategories
            ).map((category, index) => (
              <Link
                href="/explore"
                key={category}
                className="flex items-center justify-between border-b border-[#B9AD9D] py-6 transition hover:px-3"
              >
                <span className="font-serif text-xl">
                  {category}
                </span>

                <span className="text-sm text-[#77796B]">
                  0{index + 1} ↗
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* SOROTAN KREATOR */}
      <section className="grid gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:px-12 md:py-24">
        <div className="flex aspect-[4/3] items-center justify-center bg-[#77796B]">
          <p className="font-serif text-2xl italic text-[#F3EFE7]">
            Di balik setiap karya,
            <br />
            ada seorang kreator.
          </p>
        </div>

        <div>
          <p className="mb-4 text-xs tracking-[0.2em] text-[#B87559]">
            03 — PARA KREATOR
          </p>

          <h2 className="font-serif text-4xl leading-tight md:text-5xl">
            Kenali Sosok di Balik Karya.
          </h2>

          <p className="mt-6 max-w-md text-sm leading-7 text-[#77796B]">
            Temukan para kreator, kenali sudut pandang mereka,
            dan apresiasi cerita yang ingin mereka bagikan.
          </p>

          {canExplore && (
            <Link
              href="/creators"
              className="mt-8 inline-block border-b border-[#34312E] pb-2 text-sm"
            >
              Kenali Para Kreator →
            </Link>
          )}
        </div>
      </section>

      {/* TANTANGAN */}
      <section
        id="challenges"
        className="bg-[#34312E] px-6 py-20 text-[#F3EFE7] md:px-12 md:py-28"
      >
        <p className="mb-5 text-xs tracking-[0.2em] text-[#DED4C5]">
          04 — RUANG BERKARYA
        </p>

        <h2 className="max-w-2xl font-serif text-4xl leading-tight md:text-6xl">
          Setiap Karya Pantas Mendapat Ruang.
        </h2>

        <p className="mt-6 max-w-lg text-sm leading-7 text-[#DED4C5]">
          Ikuti tantangan kreatif, bagikan karyamu, dan
          jadikan ceritamu bagian dari perjalanan yang lebih besar.
        </p>

        <Link
          href={canExplore ? "/challenges" : "/register"}
          className="mt-9 inline-block bg-[#B87559] px-7 py-3 text-sm transition hover:bg-[#A3654B]"
        >
          {canExplore ? "Jelajahi Tantangan →" : "Bergabung untuk Berpartisipasi →"}
        </Link>
      </section>

      {/* TENTANG */}
      <section id="about" className="px-6 py-16 text-center md:px-12 md:py-24">
        <p className="mb-5 text-xs tracking-[0.2em] text-[#B87559]">
          TENTANG SONDER
        </p>

        <h2 className="mx-auto max-w-3xl font-serif text-3xl leading-relaxed md:text-5xl">
          Setiap orang memiliki kisah yang sama luasnya dengan dunia.
        </h2>

        <p className="mx-auto mt-7 max-w-xl text-sm leading-7 text-[#77796B]">
          SONDER merayakan keindahan berbagai perspektif melalui
          seni, kreativitas, dan hubungan antarmanusia.
        </p>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#DED4C5] px-6 py-10 md:px-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="font-serif text-3xl tracking-[0.18em]">
              SONDER.
            </h2>

            <p className="mt-2 text-sm text-[#77796B]">
              Setiap karya memiliki cerita.
            </p>
          </div>

          <div className="text-sm text-[#77796B] md:text-right">
            <p>Ruang bagi setiap perspektif kreatif.</p>
            <p className="mt-2">
              © 2026 SONDER. Hak cipta dilindungi.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
