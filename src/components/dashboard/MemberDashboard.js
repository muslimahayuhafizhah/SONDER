
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function MemberDashboard({ user }) {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadArtworks() {
      try {
        const response = await fetch("/api/artworks", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal mengambil karya.");
        }

        const myArtworks = result.data.filter(
          (artwork) =>
            Number(artwork.user_id) === Number(user.user_id)
        );

        setArtworks(myArtworks);
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadArtworks();
  }, [user.user_id]);

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Yakin ingin menghapus karya ini?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/artworks/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menghapus karya.");
      }

      setArtworks((current) =>
        current.filter(
          (artwork) => artwork.artwork_id !== id
        )
      );

      setMessage("Karya berhasil dihapus.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <nav className="border-b border-[#DED4C5] px-6 md:px-12 py-5 flex justify-between items-center">
        <Link href="/" className="font-serif text-2xl">
          SONDER
        </Link>

        <div className="flex gap-5 text-sm">
          <Link href="/explore">Explore</Link>
          <Link href="/challenges">Challenges</Link>
          <Link href="/">Home</Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 md:px-12 py-14">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#B87559] mb-3">
              Member Dashboard
            </p>

            <h1 className="font-serif text-4xl md:text-5xl mb-3">
              Welcome, {user.username}.
            </h1>

            <p className="text-[#77796B]">
              Kelola karya dan perjalanan kreatifmu di SONDER.
            </p>
          </div>

          <Link
            href="/artwork/create"
            className="bg-[#34312E] text-[#F3EFE7] px-6 py-3 text-sm hover:bg-[#B87559] transition"
          >
            + Tambah Karya
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          <div className="bg-[#DED4C5] p-7">
            <p className="text-sm text-[#77796B] mb-3">
              Total Karya
            </p>
            <p className="font-serif text-4xl">
              {artworks.length}
            </p>
          </div>

          <div className="bg-[#DED4C5] p-7">
            <p className="text-sm text-[#77796B] mb-3">
              Role
            </p>
            <p className="font-serif text-2xl">
              Member
            </p>
          </div>
        </div>

        {message && (
          <p className="text-sm text-[#B87559] mb-6">
            {message}
          </p>
        )}

        <div className="flex justify-between items-center mb-7">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#77796B] mb-2">
              Your Collection
            </p>
            <h2 className="font-serif text-3xl">
              Karya Saya
            </h2>
          </div>

          <span className="text-sm text-[#77796B]">
            {artworks.length} karya
          </span>
        </div>

        {loading ? (
          <p className="text-[#77796B]">Memuat karya...</p>
        ) : artworks.length === 0 ? (
          <div className="border border-dashed border-[#B8AA98] p-12 text-center">
            <h3 className="font-serif text-2xl mb-3">
              Belum ada karya di sini.
            </h3>

            <p className="text-sm text-[#77796B] mb-6">
              Mulai bagikan sesuatu yang punya cerita.
            </p>

            <Link
              href="/artwork/create"
              className="inline-block bg-[#34312E] text-[#F3EFE7] px-6 py-3 text-sm"
            >
              Tambahkan Karya Pertama
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {artworks.map((artwork) => (
              <article
                key={artwork.artwork_id}
                className="group"
              >
                <Link href={`/artwork/${artwork.artwork_id}`}>
                  <div className="aspect-[4/5] bg-[#DED4C5] overflow-hidden mb-4">
                    <img
                      src={artwork.image_url}
                      alt={artwork.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>

                  <p className="text-xs uppercase tracking-widest text-[#B87559] mb-2">
                    {artwork.category_name || "Artwork"}
                  </p>

                  <h3 className="font-serif text-xl mb-2">
                    {artwork.title}
                  </h3>
                </Link>

                <div className="flex gap-4 mt-4 text-sm">
                  <Link
                    href={`/artwork/${artwork.artwork_id}/edit`}
                    className="underline underline-offset-4 hover:text-[#B87559]"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => handleDelete(artwork.artwork_id)}
                    className="text-[#B87559] underline underline-offset-4"
                  >
                    Hapus
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-[#DED4C5] px-6 md:px-12 py-7 text-sm text-[#77796B]">
        SONDER — Every Piece Has a Story.
      </footer>
    </main>
  );
}
