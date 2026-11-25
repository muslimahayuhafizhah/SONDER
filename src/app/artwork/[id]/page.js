"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const reportReasons = [
  "Plagiarisme / Pelanggaran Hak Cipta",
  "Konten Tidak Pantas / NSFW",
  "Unsur SARA / Ujaran Kebencian",
  "Spam atau Konten Menyesatkan",
];

function getCollectionLabel(sourceType) {
  if (sourceType === "curated") {
    return "KOLEKSI KARYA TERKENAL · KURASI EKSTERNAL";
  }
  if (sourceType === "curator") {
    return "KOLEKSI KARYA CURATOR SONDER";
  }
  return "KOLEKSI KARYA MEMBER SONDER";
}

export default function ArtworkDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [artwork, setArtwork] = useState(null);
  const [comments, setComments] = useState([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [customReason, setCustomReason] = useState("");

  const [user, setUser] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [liking, setLiking] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadArtwork() {
      try {
        const userResponse = await fetch("/api/me", {
          cache: "no-store",
        });

        if (!userResponse.ok) {
          router.replace("/login");
          return;
        }

        const userResult = await userResponse.json();

        if (!userResult.success) {
          router.replace("/login");
          return;
        }

        const currentUser = userResult.data;

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

        if (!["member", "curator"].includes(currentUser.role)) {
          router.replace("/login");
          return;
        }

        if (!active) return;

        setUser(currentUser);
        setAccessGranted(true);

        const requests = [
          fetch(`/api/artworks/${id}`, { cache: "no-store" }),
          fetch(`/api/comments?artwork_id=${id}`, { cache: "no-store" }),
          fetch(`/api/likes?artwork_id=${id}`, { cache: "no-store" }),
        ];

        if (currentUser.role === "member") {
          requests.push(
            fetch(`/api/favorites?artwork_id=${id}`, { cache: "no-store" }),
            fetch(`/api/reports?artwork_id=${id}`, { cache: "no-store" })
          );
        }

        const responses = await Promise.all(requests);
        const results = await Promise.all(
          responses.map((res) => res.json())
        );

        const [artworkResult, commentResult, likeResult, favResult, repResult] =
          results;

        if (!responses[0].ok || !artworkResult.success) {
          throw new Error(
            artworkResult.message || "Karya tidak ditemukan."
          );
        }

        if (!responses[1].ok || !commentResult.success) {
          throw new Error("Gagal mengambil komentar.");
        }

        if (!responses[2].ok || !likeResult.success) {
          throw new Error("Gagal mengambil jumlah suka.");
        }

        if (!active) return;

        setArtwork(artworkResult.data);
        setComments(commentResult.data || []);
        setTotalLikes(Number(likeResult.data?.total_likes) || 0);
        setIsLiked(Boolean(likeResult.data?.is_liked));

        if (currentUser.role === "member") {
          if (favResult?.success) {
            setIsFavorite(
              Boolean(favResult.is_favorite ?? favResult.data?.is_favorite)
            );
          }
          if (repResult?.success) {
            setHasReported(Boolean(repResult.data?.has_reported));
          }
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) loadArtwork();

    return () => {
      active = false;
    };
  }, [id, router]);

  async function refreshInteractions() {
    const requests = [
      fetch(`/api/comments?artwork_id=${id}`, { cache: "no-store" }),
      fetch(`/api/likes?artwork_id=${id}`, { cache: "no-store" }),
    ];

    if (user?.role === "member") {
      requests.push(
        fetch(`/api/favorites?artwork_id=${id}`, { cache: "no-store" })
      );
    }

    const responses = await Promise.all(requests);
    const [commentResult, likeResult, favResult] = await Promise.all(
      responses.map((res) => res.json())
    );

    if (commentResult?.success) {
      setComments(commentResult.data || []);
    }

    if (likeResult?.success) {
      setTotalLikes(Number(likeResult.data?.total_likes) || 0);
      setIsLiked(Boolean(likeResult.data?.is_liked));
    }

    if (favResult?.success) {
      setIsFavorite(
        Boolean(favResult.is_favorite ?? favResult.data?.is_favorite)
      );
    }
  }

  async function handleLikeToggle() {
    setLiking(true);
    setMessage("");

    try {
      const response = await fetch(
        isLiked
          ? `/api/likes?artwork_id=${artwork.artwork_id}`
          : "/api/likes",
        {
          method: isLiked ? "DELETE" : "POST",
          headers: isLiked
            ? undefined
            : { "Content-Type": "application/json" },
          body: isLiked
            ? undefined
            : JSON.stringify({ artwork_id: artwork.artwork_id }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memperbarui status suka.");
      }

      setMessage(result.message);
      await refreshInteractions();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLiking(false);
    }
  }

  async function handleFavoriteToggle() {
    setFavoriting(true);
    setMessage("");

    try {
      const response = await fetch(
        isFavorite
          ? `/api/favorites?artwork_id=${artwork.artwork_id}`
          : "/api/favorites",
        {
          method: isFavorite ? "DELETE" : "POST",
          headers: isFavorite
            ? undefined
            : { "Content-Type": "application/json" },
          body: isFavorite
            ? undefined
            : JSON.stringify({ artwork_id: artwork.artwork_id }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memperbarui favorit.");
      }

      setMessage(result.message);
      await refreshInteractions();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setFavoriting(false);
    }
  }

  async function handleReportSubmit(event) {
    event.preventDefault();
    setReporting(true);
    setMessage("");

    const finalReason =
      reportReason === "custom" ? customReason.trim() : reportReason;

    if (!finalReason) {
      setMessage("Pilih atau tuliskan alasan laporan.");
      setReporting(false);
      return;
    }

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artwork_id: artwork.artwork_id,
          reason: finalReason,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengirim laporan.");
      }

      setHasReported(true);
      setShowReportForm(false);
      setMessage(result.message);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setReporting(false);
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

      await refreshInteractions();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm("Yakin ingin menghapus komentarmu ini?")) {
      return;
    }

    setDeletingCommentId(commentId);
    setMessage("");

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menghapus komentar.");
      }

      setMessage("Komentar berhasil dihapus.");
      await refreshInteractions();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setDeletingCommentId(null);
    }
  }

  if (loading || !accessGranted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFE7]">
        <p className="font-serif text-xl text-[#77796B]">
          Memuat cerita karya...
        </p>
      </main>
    );
  }

  if (error || !artwork) {
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

  const isMember = user?.role === "member";
  const isOwner =
    isMember &&
    artwork.source_type === "member" &&
    Number(artwork.user_id) === Number(user?.user_id);

  const artist =
    artwork.source_type === "curated"
      ? artwork.artist_name
      : artwork.member_username || artwork.username || artwork.artist_name;

  const tags = artwork.tags
    ? artwork.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    : [];

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-20">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/explore"
            className="text-sm text-[#89847B] hover:text-[#B87559]"
          >
            ← Kembali ke Explore
          </Link>

          {isOwner && (
            <Link
              href={`/artwork/${artwork.artwork_id}/edit`}
              className="border border-[#34312E] px-5 py-2 text-xs uppercase tracking-widest transition hover:bg-[#34312E] hover:text-[#F3EFE7]"
            >
              Edit Karya Saya
            </Link>
          )}
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.35fr_0.85fr] lg:gap-16">
          <section>
            <div className="overflow-hidden bg-[#DED4C5]">
              <img
                src={artwork.image_url}
                alt={artwork.title}
                className="max-h-[750px] w-full object-contain"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#DED4C5] pb-5 text-xs text-[#89847B]">
              <span>{getCollectionLabel(artwork.source_type)}</span>
              <span>
                {artwork.artwork_year
                  ? `Tahun Pembuatan: ${artwork.artwork_year}`
                  : `Diunggah ${new Date(artwork.created_at).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}`}
              </span>
            </div>
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.25em] text-[#B87559]">
              {artwork.category_name || "Artwork"}
            </p>

            <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
              {artwork.title}
            </h1>

            <p className="mt-4 text-sm text-[#77796B]">
              {artwork.source_type === "curated" ? (
                <>
                  Seniman:{" "}
                  <span className="font-medium text-[#34312E]">
                    {artist || "Maestro Seni"}
                  </span>{" "}
                  <span className="text-xs text-[#89847B]">
                    (Koleksi Kurasi Eksternal)
                  </span>
                </>
              ) : artwork.source_type === "curator" ? (
                <>
                  Karya Curator:{" "}
                  <span className="font-medium text-[#34312E]">
                    {artist || "Curator SONDER"}
                  </span>
                </>
              ) : (
                <>
                  Karya Member:{" "}
                  {artwork.user_id ? (
                    <Link
                      href={`/creators/${artwork.user_id}`}
                      className="font-medium text-[#34312E] underline underline-offset-4 hover:text-[#B87559]"
                    >
                      {artist || "Kreator SONDER"}
                    </Link>
                  ) : (
                    <span className="font-medium text-[#34312E]">
                      {artist || "Kreator SONDER"}
                    </span>
                  )}
                </>
              )}
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

            {/* Metadata Kurasi, Tahun, Negara Asal, Sumber & Lisensi */}
            <div className="mt-7 grid gap-4 border-t border-[#DED4C5] pt-6 sm:grid-cols-2">
              {artwork.artwork_year && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#89847B]">
                    Tahun Karya
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#34312E]">
                    {artwork.artwork_year}
                  </p>
                </div>
              )}

              {artwork.origin_country && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#89847B]">
                    Asal
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#34312E]">
                    {artwork.origin_country}
                  </p>
                </div>
              )}

              {artwork.license && (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-widest text-[#89847B]">
                    Status Lisensi / Keterangan Karya
                  </p>
                  <p className="mt-1 text-sm text-[#34312E]">
                    {artwork.license}
                  </p>
                </div>
              )}

              {artwork.source_url && (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-widest text-[#89847B]">
                    Sumber Asli & Referensi
                  </p>
                  <a
                    href={artwork.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block break-all text-xs font-medium text-[#B87559] underline underline-offset-4 hover:text-[#34312E]"
                  >
                    {artwork.source_url} ↗
                  </a>
                </div>
              )}
            </div>

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

            {/* Panel Interaksi */}
            <div className="mt-10 border-y border-[#DED4C5] py-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-serif text-2xl">{totalLikes}</p>
                  <p className="text-xs text-[#89847B]">Suka</p>
                </div>

                {isMember && (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleLikeToggle}
                      disabled={liking}
                      className={`border px-5 py-2.5 text-xs uppercase tracking-widest transition disabled:opacity-50 ${
                        isLiked
                          ? "border-[#B87559] bg-[#B87559] text-[#F3EFE7]"
                          : "border-[#34312E] hover:bg-[#34312E] hover:text-[#F3EFE7]"
                      }`}
                    >
                      {liking
                        ? "Memproses..."
                        : isLiked
                        ? "♥ Disukai"
                        : "♡ Suka Karya"}
                    </button>

                    <button
                      type="button"
                      onClick={handleFavoriteToggle}
                      disabled={favoriting}
                      className={`border px-5 py-2.5 text-xs uppercase tracking-widest transition disabled:opacity-50 ${
                        isFavorite
                          ? "border-[#34312E] bg-[#34312E] text-[#F3EFE7]"
                          : "border-[#34312E] hover:bg-[#34312E] hover:text-[#F3EFE7]"
                      }`}
                    >
                      {favoriting
                        ? "Memproses..."
                        : isFavorite
                        ? "★ Tersimpan di Favorit"
                        : "☆ Simpan ke Favorit"}
                    </button>

                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => setShowReportForm((prev) => !prev)}
                        disabled={hasReported}
                        className="border border-[#DED4C5] px-4 py-2.5 text-xs uppercase tracking-widest text-[#77796B] transition hover:border-[#B87559] hover:text-[#B87559] disabled:opacity-50"
                      >
                        {hasReported ? "✓ Sudah Dilaporkan" : "⚑ Laporkan"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isMember && showReportForm && !hasReported && !isOwner && (
                <form
                  onSubmit={handleReportSubmit}
                  className="mt-6 border border-[#DED4C5] bg-[#FCFAF6] p-5"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-[#B87559]">
                    Report Artwork
                  </p>
                  <p className="mt-1 text-xs text-[#77796B]">
                    Pilih alasan mengapa karya ini melanggar ketentuan komunitas SONDER:
                  </p>

                  <select
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    className="mt-4 w-full border border-[#DED4C5] bg-[#F3EFE7] px-3 py-2.5 text-sm outline-none focus:border-[#B87559]"
                  >
                    {reportReasons.map((reasonOption) => (
                      <option key={reasonOption} value={reasonOption}>
                        {reasonOption}
                      </option>
                    ))}
                    <option value="custom">Alasan Lainnya...</option>
                  </select>

                  {reportReason === "custom" && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(event) => setCustomReason(event.target.value)}
                      placeholder="Tuliskan alasan laporan (maks. 100 karakter)..."
                      maxLength={100}
                      required
                      className="mt-3 w-full border border-[#DED4C5] bg-[#F3EFE7] px-3 py-2.5 text-sm outline-none focus:border-[#B87559]"
                    />
                  )}

                  <div className="mt-4 flex gap-3">
                    <button
                      type="submit"
                      disabled={reporting}
                      className="bg-[#B87559] px-5 py-2 text-xs uppercase tracking-widest text-[#F3EFE7] transition hover:bg-[#9F6047] disabled:opacity-50"
                    >
                      {reporting ? "Mengirim..." : "Kirim Laporan"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowReportForm(false)}
                      className="border border-[#DED4C5] px-5 py-2 text-xs uppercase tracking-widest text-[#77796B]"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {message && (
                <p className="mt-4 text-sm text-[#B87559]">
                  {message}
                </p>
              )}
            </div>

            {/* Bagian Komentar */}
            <div className="mt-9">
              <h2 className="font-serif text-2xl">
                Cerita dari Pengunjung
              </h2>

              <p className="mt-2 text-xs text-[#89847B]">
                {comments.length} komentar
              </p>

              {isMember ? (
                <form onSubmit={handleComment} className="mt-6">
                  <textarea
                    value={commentText}
                    onChange={(event) =>
                      setCommentText(event.target.value)
                    }
                    placeholder="Tuliskan pendapatmu tentang karya ini..."
                    rows={3}
                    maxLength={1000}
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
              ) : (
                <p className="mt-5 text-xs text-[#89847B]">
                  Kamu sedang melihat karya dalam mode baca (Curator).
                </p>
              )}

              <div className="mt-8 space-y-6">
                {comments.length === 0 ? (
                  <p className="py-6 text-sm italic text-[#89847B]">
                    Belum ada komentar. Jadilah yang pertama berbagi cerita.
                  </p>
                ) : (
                  comments.map((comment) => {
                    const isMyComment =
                      isMember &&
                      Number(comment.user_id) === Number(user?.user_id);

                    return (
                      <article
                        key={comment.comment_id}
                        className="border-b border-[#DED4C5] pb-5"
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/creators/${comment.user_id}`}
                            className="text-sm font-medium hover:text-[#B87559]"
                          >
                            {comment.username}
                          </Link>

                          {isMyComment && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteComment(comment.comment_id)
                              }
                              disabled={
                                deletingCommentId === comment.comment_id
                              }
                              className="text-xs text-[#B87559] underline underline-offset-4 disabled:opacity-50"
                            >
                              {deletingCommentId === comment.comment_id
                                ? "Menghapus..."
                                : "Hapus"}
                            </button>
                          )}
                        </div>

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
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

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
