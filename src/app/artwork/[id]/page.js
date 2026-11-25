
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ArtworkDetailPage() {
  const { id } = useParams();

  const [artwork, setArtwork] = useState(null);
  const [comments, setComments] = useState([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [commentText, setCommentText] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (id) {
      loadArtwork();
    }
  }, [id]);

  async function loadArtwork() {
    setLoading(true);
    setError("");

    try {
      const [artworkResponse, commentResponse, likeResponse] =
        await Promise.all([
          fetch("/api/artworks"),
          fetch(`/api/comments?artwork_id=${id}`),
          fetch(`/api/likes?artwork_id=${id}`),
        ]);

      const artworkResult = await artworkResponse.json();
      const commentResult = await commentResponse.json();
      const likeResult = await likeResponse.json();

      if (!artworkResponse.ok || !artworkResult.success) {
        throw new Error("Gagal mengambil data karya.");
      }

      if (!commentResponse.ok || !commentResult.success) {
        throw new Error("Gagal mengambil komentar.");
      }

      if (!likeResponse.ok || !likeResult.success) {
        throw new Error("Gagal mengambil jumlah suka.");
      }

      const selectedArtwork = artworkResult.data.find(
        (item) => String(item.artwork_id) === String(id)
      );

      if (!selectedArtwork) {
        throw new Error("Karya tidak ditemukan.");
      }

      setArtwork(selectedArtwork);
      setComments(commentResult.data);
      setTotalLikes(Number(likeResult.data.total_likes) || 0);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike() {
    setLiking(true);
    setMessage("");

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artwork_id: artwork.artwork_id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menyukai karya.");
      }

      setMessage("Karya berhasil disukai.");
      await loadArtwork();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLiking(false);
    }
  }

  async function handleComment(event) {
    event.preventDefault();

    if (!commentText.trim()) {
      setMessage("Komentar tidak boleh kosong.");
      return;
    }

    setSending(true);
    setMessage("");

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artwork_id: artwork.artwork_id,
          comment_text: commentText.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengirim komentar.");
      }

      setCommentText("");
      setMessage("Komentar berhasil dikirim.");

      await loadArtwork();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFE7]">
        <p className="font-serif text-xl text-[#77796B]">
          Memuat cerita karya...
        </p>
      </main>
    );
  }

  if (error && !artwork) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F3EFE7] px-6 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#B87559]">
          Artwork not found
        </p>
        <h1 className="font-serif text-3xl">{error}</h1>
        <Link
          href="/explore"
          className="mt-6 text-sm underline underline-offset-4"
        >
          Kembali ke Explore
        </Link>
      </main>
    );
  }

  const artist =
    artwork.source_type === "curated"
      ? artwork.artist_name
      : artwork.member_username;

  const tags = artwork.tags
    ? artwork.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    : [];

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      {/* Navigasi */}
      <nav className="border-b border-[#DED4C5]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-serif text-2xl tracking-[0.15em]"
          >
            SONDER<span className="text-[#B87559]">.</span>
          </Link>

          <div className="flex items-center gap-6 text-sm">
            <Link href="/" className="hidden hover:text-[#B87559] sm:block">
              Home
            </Link>
            <Link href="/explore" className="hover:text-[#B87559]">
              Explore
            </Link>
            <Link href="/login" className="hover:text-[#B87559]">
              Masuk
            </Link>
          </div>
        </div>
      </nav>

      {/* Konten karya */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-20">
        <Link
          href="/explore"
          className="mb-10 inline-block text-sm text-[#89847B] hover:text-[#B87559]"
        >
          ← Kembali ke Explore
        </Link>

        <div className="grid gap-12 lg:grid-cols-[1.35fr_0.85fr] lg:gap-16">
          {/* Gambar karya */}
          <section>
            <div className="overflow-hidden bg-[#DED4C5]">
              <img
                src={artwork.image_url}
                alt={artwork.title}
                className="max-h-[750px] w-full object-contain"
              />
            </div>

            <div className="mt-5 flex items-center justify-between border-b border-[#DED4C5] pb-5 text-xs text-[#89847B]">
              <span>SONDER ART COLLECTION</span>
              <span>
                {artwork.artwork_year || "Tahun tidak dicantumkan"}
              </span>
            </div>
          </section>

          {/* Informasi karya */}
          <section>
            <p className="text-xs uppercase tracking-[0.25em] text-[#B87559]">
              {artwork.category_name || "Artwork"}
            </p>

            <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
              {artwork.title}
            </h1>

            <p className="mt-4 text-sm text-[#77796B]">
              Karya oleh{" "}
              <span className="font-medium text-[#34312E]">
                {artist || "Artisan"}
              </span>
            </p>

            <div className="my-8 h-px bg-[#DED4C5]" />

            <div>
              <h2 className="mb-3 font-serif text-xl">
                Tentang Karya
              </h2>

              <p className="whitespace-pre-line text-sm leading-8 text-[#77796B]">
                {artwork.description}
              </p>
            </div>

            {artwork.origin_country && (
              <div className="mt-7">
                <p className="text-xs uppercase tracking-widest text-[#89847B]">
                  Asal
                </p>
                <p className="mt-2 text-sm">{artwork.origin_country}</p>
              </div>
            )}

            {tags.length > 0 && (
              <div className="mt-8">
                <p className="mb-3 text-xs uppercase tracking-widest text-[#89847B]">
                  Tags
                </p>

                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="border border-[#DED4C5] px-3 py-2 text-xs text-[#77796B]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Interaksi */}
            <div className="mt-10 border-y border-[#DED4C5] py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-serif text-2xl">{totalLikes}</p>
                  <p className="text-xs text-[#89847B]">Suka</p>
                </div>

                <button
                  onClick={handleLike}
                  disabled={liking}
                  className="border border-[#34312E] px-6 py-3 text-sm transition hover:bg-[#34312E] hover:text-[#F3EFE7] disabled:opacity-50"
                >
                  {liking ? "Memproses..." : "♡ Suka Karya"}
                </button>
              </div>

              {message && (
                <p className="mt-4 text-sm text-[#B87559]">
                  {message}
                </p>
              )}
            </div>

            {/* Komentar */}
            <div className="mt-9">
              <h2 className="font-serif text-2xl">
                Cerita dari Pengunjung
              </h2>

              <p className="mt-2 text-xs text-[#89847B]">
                {comments.length} komentar
              </p>

              <form onSubmit={handleComment} className="mt-6">
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Tuliskan pendapatmu tentang karya ini..."
                  rows={3}
                  className="w-full resize-none border border-[#DED4C5] bg-[#FCFAF6] p-4 text-sm outline-none transition focus:border-[#B87559]"
                />

                <button
                  type="submit"
                  disabled={sending}
                  className="mt-3 bg-[#34312E] px-6 py-3 text-sm text-[#F3EFE7] transition hover:bg-[#77796B] disabled:opacity-50"
                >
                  {sending ? "Mengirim..." : "Kirim Komentar"}
                </button>
              </form>

              <div className="mt-8 space-y-6">
                {comments.length === 0 ? (
                  <p className="py-6 text-sm italic text-[#89847B]">
                    Belum ada komentar. Jadilah yang pertama berbagi cerita.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <article
                      key={comment.comment_id}
                      className="border-b border-[#DED4C5] pb-5"
                    >
                      <p className="text-sm font-medium">
                        {comment.username}
                      </p>

                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#77796B]">
                        {comment.comment_text}
                      </p>

                      <p className="mt-2 text-xs text-[#89847B]">
                        {new Date(comment.created_at).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#DED4C5] px-6 py-8 text-center">
        <p className="font-serif text-lg tracking-widest">
          SONDER<span className="text-[#B87559]">.</span>
        </p>
        <p className="mt-2 text-xs text-[#89847B]">
          Every Piece Has a Story.
        </p>
      </footer>
    </main>
  );
}
