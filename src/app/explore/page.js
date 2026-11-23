
"use client";

import { useEffect, useMemo, useState } from "react";

export default function ExplorePage() {
  const [artworks, setArtworks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Mengambil data karya dan kategori dari database melalui API
  useEffect(() => {
    async function getExploreData() {
      try {
        setLoading(true);
        setError("");

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

        setArtworks(artworkResult.data || []);
        setCategories(categoryResult.data || []);
      } catch (err) {
        setError(err.message || "Terjadi kesalahan.");
      } finally {
        setLoading(false);
      }
    }

    getExploreData();
  }, []);

  // Pencarian dan filter karya
  const filteredArtworks = useMemo(() => {
    return artworks.filter((artwork) => {
      const artist =
        artwork.source_type === "curated"
          ? artwork.artist_name
          : artwork.username;

      const keyword = search.toLowerCase();

      const matchesSearch =
        artwork.title?.toLowerCase().includes(keyword) ||
        artwork.description?.toLowerCase().includes(keyword) ||
        artist?.toLowerCase().includes(keyword) ||
        artwork.tags?.toLowerCase().includes(keyword);

      const matchesCategory =
        selectedCategory === "all" ||
        String(artwork.category_id) === String(selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [artworks, search, selectedCategory]);

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">

      {/* Navigation */}
      <nav className="flex h-[82px] items-center justify-between border-b border-[#DED4C5] px-[7%]">
        <a href="/" className="font-serif text-3xl font-semibold tracking-tight">
          sonder<span className="text-[#B87559]">.</span>
        </a>

        <div className="flex items-center gap-8 text-sm text-[#77796B]">
          <a href="/" className="transition hover:text-[#B87559]">
            Home
          </a>
          <a href="/explore" className="text-[#B87559]">
            Explore
          </a>
          <a href="/challenges" className="transition hover:text-[#B87559]">
            Challenges
          </a>
        </div>

        <a href="/login" className="text-sm text-[#77796B] hover:text-[#B87559]">
          Sign in ↗
        </a>
      </nav>

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
            {filteredArtworks.length} pieces
          </p>
        </div>

        {/* Search and Category Filter */}
        <div className="mb-10 flex flex-col gap-4 md:flex-row">
          <div className="flex h-12 flex-1 items-center border border-[#DED4C5] bg-[#FCFAF6] px-4">
            <span className="mr-3 text-xl text-[#B87559]">⌕</span>

            <input
              type="text"
              placeholder="Search artworks, artists, or tags..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#AAA398]"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="h-12 border border-[#DED4C5] bg-[#FCFAF6] px-4 text-sm outline-none md:w-52"
          >
            <option value="all">All Categories</option>

            {categories.map((category) => (
              <option
                key={category.category_id}
                value={category.category_id}
              >
                {category.category_name}
              </option>
            ))}
          </select>
        </div>

        {/* Artwork Results */}
        {loading ? (
          <div className="flex min-h-56 items-center justify-center">
            <p className="font-serif text-2xl">Gathering stories...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-4">
            <p className="font-serif text-2xl">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#34312E] px-6 py-3 text-sm text-[#FCFAF6] transition hover:bg-[#B87559]"
            >
              Try again
            </button>
          </div>
        ) : filteredArtworks.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
            <p className="font-serif text-2xl">No artworks found.</p>
            <p className="text-sm text-[#77796B]">
              Try another keyword or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArtworks.map((artwork) => {
              const artist =
                artwork.source_type === "curated"
                  ? artwork.artist_name
                  : artwork.username;

              return (
                <article
                  key={artwork.artwork_id}
                  className="group min-w-0"
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

                    <span className="absolute bottom-4 left-4 bg-[#F3EFE7] px-3 py-2 text-[10px] uppercase tracking-wider">
                      {artwork.category_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-5">
                    <div>
                      <h3 className="font-serif text-xl">
                        {artwork.title}
                      </h3>

                      <p className="mt-1 text-xs text-[#89847B]">
                        by {artist || "Unknown artist"}
                      </p>
                    </div>

                    <span className="text-xl text-[#B87559]">↗</span>
                  </div>

                  {artwork.description && (
                    <p className="mt-3 text-xs leading-6 text-[#77796B]">
                      {artwork.description}
                    </p>
                  )}
                </article>
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

      {/* Footer */}
      <footer className="flex flex-col justify-between gap-4 px-[10%] py-8 sm:flex-row sm:items-center">
        <a href="/" className="font-serif text-2xl">
          sonder.
        </a>

        <span className="text-xs text-[#89847B]">
          © 2026 SONDER. Every piece has a story.
        </span>
      </footer>
    </main>
  );
}
