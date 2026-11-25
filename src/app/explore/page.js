"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function getSourceBadge(artwork) {
  if (artwork.source_type === "curated") {
    return "Koleksi Terkenal · Kurasi";
  }
  if (artwork.source_type === "curator") {
    return "Karya Curator";
  }
  return "Karya Member";
}

function getArtistDisplay(artwork) {
  if (artwork.source_type === "curated") {
    return artwork.artist_name || "Maestro Seni";
  }
  if (artwork.source_type === "curator") {
    return `${
      artwork.member_username || artwork.username || artwork.artist_name || "Curator"
    } (Curator)`;
  }
  return (
    artwork.member_username ||
    artwork.username ||
    artwork.artist_name ||
    "Member SONDER"
  );
}

export default function ExplorePage() {
  const router = useRouter();

  const [artworks, setArtworks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function getExploreData() {
      try {
        const userResponse = await fetch("/api/me", {
          cache: "no-store",
        });

        const userResult = await userResponse.json();

        if (!userResponse.ok || !userResult.success) {
          router.replace("/login");
          return;
        }

        const user = userResult.data;

        if (user.role === "admin") {
          router.replace("/dashboard");
          return;
        }

        if (
          user.role === "curator" &&
          user.curator_status !== "approved"
        ) {
          router.replace("/curator/pending");
          return;
        }

        if (user.role !== "member" && user.role !== "curator") {
          router.replace("/login");
          return;
        }

        if (!active) return;

        setAccessGranted(true);

        const [artworkResponse, categoryResponse] = await Promise.all([
          fetch("/api/artworks", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
        ]);

        const artworkResult = await artworkResponse.json();
        const categoryResult = await categoryResponse.json();

        if (!artworkResponse.ok || !artworkResult.success) {
          throw new Error("Gagal mengambil data karya.");
        }

        if (!categoryResponse.ok || !categoryResult.success) {
          throw new Error("Gagal mengambil data kategori.");
        }

        if (!active) return;

        setArtworks(artworkResult.data || []);
        setCategories(categoryResult.data || []);
      } catch (err) {
        if (active) {
          setError(err.message || "Terjadi kesalahan.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    getExploreData();

    return () => {
      active = false;
    };
  }, [router]);

  const filteredArtworks = useMemo(() => {
    const filtered = artworks.filter((artwork) => {
      const artist = getArtistDisplay(artwork);
      const keyword = search.toLowerCase();

      const matchesSearch =
        artwork.title?.toLowerCase().includes(keyword) ||
        artwork.description?.toLowerCase().includes(keyword) ||
        artist?.toLowerCase().includes(keyword) ||
        artwork.tags?.toLowerCase().includes(keyword);

      const matchesCategory =
        selectedCategory === "all" ||
        String(artwork.category_id) === String(selectedCategory);

      const matchesSource =
        selectedSource === "all" ||
        artwork.source_type === selectedSource;

      return matchesSearch && matchesCategory && matchesSource;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "popular") {
        const diff = Number(b.total_likes || 0) - Number(a.total_likes || 0);
        if (diff !== 0) return diff;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [artworks, search, selectedCategory, selectedSource, sortBy]);

  if (!accessGranted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFE7] text-[#77796B]">
        Memeriksa akses...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      {/* Introduction */}
      <section className="border-b border-[#DED4C5] px-[10%] py-24">
        <p className="text-xs font-semibold tracking-[0.25em] text-[#B87559]">
          THE CREATIVE COLLECTION
        </p>

        <h1 className="mt-7 font-serif text-6xl font-normal leading-[1.05] tracking-tight md:text-8xl">
          Explore the
          <br />
          <em className="text-[#B87559]">unseen stories.</em>
        </h1>

        <p className="mt-8 max-w-md text-sm leading-8 text-[#77796B]">
          A collection of perspectives, emotions, and ideas.
          Discover the stories behind every piece of art.
        </p>

        <div className="mt-16 flex justify-between text-[10px] tracking-[0.18em] text-[#89847B]">
          <span>01 — THE COLLECTION</span>
          <span>ARTWORKS & CREATIVE EXPRESSION</span>
        </div>
      </section>

      {/* Artwork Collection */}
      <section className="px-[10%] py-20">
        <div className="mb-9 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#B87559]">
              DISCOVER SOMETHING NEW
            </p>

            <h2 className="mt-3 font-serif text-4xl font-normal">
              Artworks & Stories
            </h2>
          </div>

          <p className="text-xs text-[#89847B]">
            {filteredArtworks.length} karya
          </p>
        </div>

        {/* Search, Source Filter, Category Filter, and Sort */}
        <div className="mb-10 flex flex-col gap-4 lg:flex-row">
          <div className="flex h-12 flex-1 items-center border border-[#DED4C5] bg-[#FCFAF6] px-4">
            <span className="mr-3 text-xl text-[#B87559]">⌕</span>

            <input
              type="text"
              placeholder="Cari judul karya, seniman/kreator, atau tags..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#AAA398]"
            />
          </div>

          <select
            value={selectedSource}
            onChange={(event) => setSelectedSource(event.target.value)}
            className="h-12 border border-[#DED4C5] bg-[#FCFAF6] px-4 text-sm outline-none lg:w-56"
          >
            <option value="all">Semua Koleksi</option>
            <option value="member">Karya Member</option>
            <option value="curator">Karya Curator</option>
            <option value="curated">Koleksi Terkenal (Kurasi)</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="h-12 border border-[#DED4C5] bg-[#FCFAF6] px-4 text-sm outline-none lg:w-52"
          >
            <option value="all">Semua Kategori</option>

            {categories.map((category) => (
              <option
                key={category.category_id}
                value={category.category_id}
              >
                {category.category_name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-12 border border-[#DED4C5] bg-[#FCFAF6] px-4 text-sm outline-none lg:w-44"
          >
            <option value="latest">Terbaru</option>
            <option value="popular">Terpopuler (Suka)</option>
          </select>
        </div>

        {/* Artwork Results */}
        {loading ? (
          <div className="flex min-h-56 items-center justify-center">
            <p className="font-serif text-2xl">Memuat karya...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-4">
            <p className="font-serif text-2xl">{error}</p>

            <button
              onClick={() => window.location.reload()}
              className="bg-[#34312E] px-6 py-3 text-sm text-[#FCFAF6] transition hover:bg-[#B87559]"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredArtworks.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
            <p className="font-serif text-2xl">Tidak ada karya ditemukan.</p>

            <p className="text-sm text-[#77796B]">
              Coba gunakan kata kunci, koleksi, atau kategori lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArtworks.map((artwork) => {
              const artist = getArtistDisplay(artwork);

              return (
                <Link
                  key={artwork.artwork_id}
                  href={`/artwork/${artwork.artwork_id}`}
                  className="group block min-w-0"
                >
                  <div className="relative h-[340px] overflow-hidden bg-[#DED4C5]">
                    <img
                      src={artwork.image_url}
                      alt={artwork.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />

                    <span className="absolute left-4 top-4 bg-[#34312E]/90 px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#F3EFE7]">
                      {getSourceBadge(artwork)}
                    </span>

                    <span className="absolute bottom-4 left-4 bg-[#F3EFE7] px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#34312E]">
                      {artwork.category_name}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3 pt-5">
                    <div>
                      <h3 className="font-serif text-xl group-hover:text-[#B87559]">
                        {artwork.title}
                      </h3>

                      <p className="mt-1 text-xs text-[#89847B]">
                        oleh <span className="text-[#34312E]">{artist}</span>
                        {artwork.artwork_year ? ` · ${artwork.artwork_year}` : ""}{" "}
                        · ♡ {artwork.total_likes || 0}
                      </p>
                    </div>

                    <span className="text-xl text-[#B87559]">↗</span>
                  </div>

                  {artwork.description && (
                    <p className="mt-3 line-clamp-2 text-xs leading-6 text-[#77796B]">
                      {artwork.description}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Closing Section */}
      <section className="bg-[#E8E0D4] px-6 py-24 text-center">
        <p className="text-[10px] tracking-[0.2em] text-[#77796B]">
          SONDER — EVERY PIECE HAS A STORY.
        </p>

        <h2 className="mt-6 font-serif text-4xl font-normal leading-tight md:text-6xl">
          Every perspective
          <br />
          deserves <em className="text-[#B87559]">to be seen.</em>
        </h2>
      </section>

      <footer className="flex flex-col justify-between gap-4 px-[10%] py-8 sm:flex-row sm:items-center">
        <Link href="/" className="font-serif text-2xl">
          sonder.
        </Link>

        <span className="text-xs text-[#89847B]">
          © 2026 SONDER. Every piece has a story.
        </span>
      </footer>
    </main>
  );
}
