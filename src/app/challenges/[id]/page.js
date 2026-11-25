"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ChallengeDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [challenge, setChallenge] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [winners, setWinners] = useState([]);
  const [myArtworks, setMyArtworks] = useState([]);
  const [selectedArtwork, setSelectedArtwork] = useState("");
  const [user, setUser] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [error, setError] = useState("");

  const refreshChallengeAndSubmissions = useCallback(async () => {
    const [challengeRes, submissionRes, winnerRes] = await Promise.all([
      fetch(`/api/challenges/${id}`, { cache: "no-store" }),
      fetch(`/api/challenges/${id}/submissions`, { cache: "no-store" }),
      fetch(`/api/challenges/${id}/winners`, { cache: "no-store" }),
    ]);

    const [challengeData, submissionData, winnerData] = await Promise.all([
      challengeRes.json(),
      submissionRes.json(),
      winnerRes.json(),
    ]);

    if (challengeRes.ok && challengeData.success) {
      setChallenge(challengeData.data);
    }

    if (submissionRes.ok && submissionData.success) {
      setSubmissions(submissionData.data || []);
    }

    if (winnerRes.ok && winnerData.success) {
      setWinners(winnerData.data || []);
    }
  }, [id]);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
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

        const [challengeRes, submissionRes, winnerRes] =
          await Promise.all([
            fetch(`/api/challenges/${id}`, {
              cache: "no-store",
            }),
            fetch(`/api/challenges/${id}/submissions`, {
              cache: "no-store",
            }),
            fetch(`/api/challenges/${id}/winners`, {
              cache: "no-store",
            }),
          ]);

        const [challengeData, submissionData, winnerData] =
          await Promise.all([
            challengeRes.json(),
            submissionRes.json(),
            winnerRes.json(),
          ]);

        if (!challengeRes.ok || !challengeData.success) {
          throw new Error(
            challengeData.message || "Challenge tidak ditemukan."
          );
        }

        if (!submissionRes.ok || !submissionData.success) {
          throw new Error(
            submissionData.message || "Gagal mengambil daftar peserta."
          );
        }

        if (!winnerRes.ok || !winnerData.success) {
          throw new Error(
            winnerData.message || "Gagal mengambil daftar pemenang."
          );
        }

        if (!active) return;

        setChallenge(challengeData.data);
        setSubmissions(submissionData.data || []);
        setWinners(winnerData.data || []);

        if (currentUser.role === "member") {
          const artworkRes = await fetch("/api/artworks", {
            cache: "no-store",
          });

          const artworkData = await artworkRes.json();

          if (artworkRes.ok && artworkData.success && active) {
            const memberWorks = (artworkData.data || []).filter(
              (artwork) =>
                Number(artwork.user_id) === Number(currentUser.user_id) &&
                artwork.source_type === "member" &&
                artwork.status === "published"
            );
            setMyArtworks(memberWorks);
          }
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (id) {
      loadDetail();
    }

    return () => {
      active = false;
    };
  }, [id, router]);

  function parseLocalDate(date) {
    const [year, month, day] = String(date)
      .slice(0, 10)
      .split("-");

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  }

  function formatDate(date) {
    if (!date) return "-";
    return parseLocalDate(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatDateTime(timestamp) {
    if (!timestamp) return "-";
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return formatDate(timestamp);

    return parsed.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatus() {
    if (!challenge) return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = parseLocalDate(challenge.start_date);
    const end = parseLocalDate(challenge.end_date);

    if (today < start) return "Segera Dibuka";
    if (today > end) return "Selesai";

    return "Sedang Berlangsung";
  }

  async function handleSubmitArtwork(event) {
    if (event) event.preventDefault();

    if (!selectedArtwork) {
      setFeedback({
        type: "error",
        text: "Pilih karya terlebih dahulu sebelum mengirim submission.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: "", text: "" });

    try {
      const response = await fetch(
        `/api/challenges/${id}/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artwork_id: Number(selectedArtwork),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengirim karya ke challenge."
        );
      }

      setSelectedArtwork("");
      await refreshChallengeAndSubmissions();

      setFeedback({
        type: "success",
        text: result.message || "Karya berhasil dikirim ke challenge!",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.message || "Gagal mengirim karya ke challenge.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(submissionId) {
    if (
      !window.confirm(
        "Yakin ingin menarik karya dari challenge ini?"
      )
    ) {
      return;
    }

    setWithdrawing(true);
    setFeedback({ type: "", text: "" });

    try {
      const response = await fetch(
        `/api/challenges/${id}/submissions?submission_id=${submissionId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menarik karya."
        );
      }

      await refreshChallengeAndSubmissions();

      setFeedback({
        type: "success",
        text: result.message || "Karya berhasil ditarik dari challenge.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err.message || "Gagal menarik karya.",
      });
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading || !accessGranted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFE7] text-[#77796B]">
        Memuat detail challenge...
      </main>
    );
  }

  if (error || !challenge) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F3EFE7] px-6 text-center text-[#34312E]">
        <h1 className="font-serif text-3xl">
          Challenge tidak ditemukan
        </h1>

        <p className="mt-3 text-sm text-[#77796B]">
          {error}
        </p>

        <Link
          href="/challenges"
          className="mt-6 text-[#B87559] underline"
        >
          Kembali ke Challenges
        </Link>
      </main>
    );
  }

  const isMember = user?.role === "member";
  const statusLabel = getStatus();
  const isActive = statusLabel === "Sedang Berlangsung";

  const mySubmission = submissions.find(
    (submission) =>
      Number(submission.user_id) === Number(user?.user_id) &&
      submission.status === "active"
  );

  const myWinningRank = mySubmission
    ? winners.find(
        (w) => Number(w.submission_id) === Number(mySubmission.submission_id)
      )?.rank
    : null;

  const selectedArtworkPreview = myArtworks.find(
    (art) => String(art.artwork_id) === String(selectedArtwork)
  );

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:px-12">
        <Link
          href="/challenges"
          className="text-xs uppercase tracking-widest text-[#77796B] hover:text-[#B87559]"
        >
          ← Kembali ke Challenges
        </Link>

        <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-center">
          <div className="overflow-hidden bg-[#DED4C5]">
            {challenge.banner_url && !bannerError ? (
              <img
                src={challenge.banner_url}
                alt={challenge.title}
                onError={() => setBannerError(true)}
                className="h-80 w-full object-cover"
              />
            ) : (
              <div className="flex h-80 items-center justify-center bg-[#77796B] font-serif text-4xl text-[#F3EFE7]">
                SONDER
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[#B87559]">
                {statusLabel}
              </p>
              <span className="text-xs text-[#77796B]">
                · Dikurasi oleh{" "}
                <strong className="font-medium text-[#34312E]">
                  {challenge.curator_username || "Curator"}
                </strong>
              </span>
            </div>

            <h1 className="mt-5 font-serif text-4xl leading-tight md:text-5xl">
              {challenge.title}
            </h1>

            <p className="mt-5 text-sm leading-7 text-[#77796B]">
              {challenge.description}
            </p>

            <div className="mt-8 grid gap-4 border-t border-[#DED4C5] pt-5 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#B87559]">
                  Periode Challenge
                </p>

                <p className="mt-2 text-sm">
                  {formatDate(challenge.start_date)} —{" "}
                  {formatDate(challenge.end_date)}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-[#B87559]">
                  Partisipan Aktif
                </p>

                <p className="mt-2 text-sm">
                  {submissions.length} karya peserta
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-[#DED4C5] pt-5">
              <p className="text-xs uppercase tracking-widest text-[#B87559]">
                Reward
              </p>

              <p className="mt-2 text-sm leading-6">
                {challenge.reward}
              </p>
            </div>
          </div>
        </div>

        <section className="mt-20 border-t border-[#DED4C5] pt-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#B87559]">
            Before You Join
          </p>

          <h2 className="mt-3 font-serif text-3xl">
            Aturan Challenge
          </h2>

          <p className="mt-6 whitespace-pre-line text-sm leading-8 text-[#77796B]">
            {challenge.rules}
          </p>
        </section>

        {/* Panel Partisipasi Member */}
        {isMember && (
          <section className="mt-16 border border-[#DED4C5] bg-[#FCFAF6] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[#B87559]">
              Join The Challenge
            </p>

            <h2 className="mt-3 font-serif text-3xl">
              {mySubmission ? "Status Submisi Kamu" : "Kirim Karyamu"}
            </h2>

            {feedback.text && (
              <div
                className={`mt-5 border-l-2 px-4 py-3 text-sm ${
                  feedback.type === "success"
                    ? "border-[#77796B] bg-[#77796B]/10 text-[#34312E]"
                    : "border-[#B87559] bg-[#B87559]/10 text-[#8B4935]"
                }`}
              >
                {feedback.text}
              </div>
            )}

            {mySubmission ? (
              <div className="mt-6 flex flex-col justify-between gap-6 border border-[#DED4C5] bg-[#F3EFE7] p-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  {mySubmission.image_url && (
                    <img
                      src={mySubmission.image_url}
                      alt={mySubmission.title}
                      className="h-24 w-24 object-cover bg-[#DED4C5]"
                    />
                  )}

                  <div>
                    <span className="inline-block bg-[#34312E] px-3 py-1 text-[10px] uppercase tracking-widest text-[#F3EFE7]">
                      {myWinningRank
                        ? `★ Pemenang Juara ${myWinningRank}`
                        : "Submisi Aktif"}
                    </span>

                    <h3 className="mt-2 font-serif text-2xl">
                      {mySubmission.title}
                    </h3>

                    <p className="mt-1 text-xs text-[#77796B]">
                      Dikirim pada {formatDateTime(mySubmission.submitted_at)}
                    </p>
                  </div>
                </div>

                {isActive && !myWinningRank && (
                  <button
                    type="button"
                    disabled={withdrawing}
                    onClick={() =>
                      handleWithdraw(mySubmission.submission_id)
                    }
                    className="self-start border border-[#B87559] px-5 py-3 text-xs uppercase tracking-widest text-[#B87559] transition hover:bg-[#B87559] hover:text-white disabled:opacity-50 sm:self-center"
                  >
                    {withdrawing ? "Menarik Karya..." : "Tarik Karya (Withdraw)"}
                  </button>
                )}
              </div>
            ) : !isActive ? (
              <p className="mt-5 text-sm text-[#77796B]">
                {statusLabel === "Segera Dibuka"
                  ? "Challenge ini belum dimulai. Kamu dapat mengirim karya setelah memasuki tanggal mulai challenge."
                  : "Periode challenge ini sudah berakhir. Pengiriman karya sudah ditutup."}
              </p>
            ) : myArtworks.length === 0 ? (
              <div className="mt-5">
                <p className="text-sm text-[#77796B]">
                  Kamu belum memiliki karya yang dipublikasikan. Unggah karya terlebih dahulu sebelum mengikuti challenge.
                </p>
                <Link
                  href="/artwork/create"
                  className="mt-4 inline-block bg-[#34312E] px-6 py-3 text-xs uppercase tracking-widest text-[#F3EFE7] transition hover:bg-[#B87559]"
                >
                  + Unggah Karya Baru
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmitArtwork} className="mt-6">
                <label className="mb-3 block text-sm font-medium">
                  Pilih karya dari portofoliomu ({myArtworks.length} karya tersedia)
                </label>

                <select
                  value={selectedArtwork}
                  onChange={(e) => {
                    setSelectedArtwork(e.target.value);
                    setFeedback({ type: "", text: "" });
                  }}
                  className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
                >
                  <option value="">-- Pilih karya yang ingin dikirim --</option>

                  {myArtworks.map((artwork) => (
                    <option
                      key={artwork.artwork_id}
                      value={artwork.artwork_id}
                    >
                      {artwork.title} ({artwork.category_name})
                    </option>
                  ))}
                </select>

                {selectedArtworkPreview && (
                  <div className="mt-4 flex items-center gap-4 border border-[#DED4C5] bg-[#F3EFE7] p-4">
                    <img
                      src={selectedArtworkPreview.image_url}
                      alt={selectedArtworkPreview.title}
                      className="h-20 w-20 object-cover bg-[#DED4C5]"
                    />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-[#B87559]">
                        Pratinjau Karya Terpilih
                      </p>
                      <h4 className="mt-1 font-serif text-xl">
                        {selectedArtworkPreview.title}
                      </h4>
                      <p className="text-xs text-[#77796B]">
                        {selectedArtworkPreview.category_name}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 bg-[#34312E] px-6 py-3 text-xs uppercase tracking-widest text-[#F3EFE7] transition hover:bg-[#B87559] disabled:opacity-50"
                >
                  {submitting ? "Mengirim Karya..." : "Submit Artwork"}
                </button>
              </form>
            )}
          </section>
        )}

        <section className="mt-20 border-t border-[#DED4C5] pt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#B87559]">
                Community Works
              </p>

              <h2 className="mt-3 font-serif text-3xl">
                Karya Peserta
              </h2>
            </div>

            <span className="text-xs text-[#77796B]">
              {submissions.length} karya
            </span>
          </div>

          {submissions.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#77796B]">
              Belum ada karya yang dikumpulkan.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {submissions.map((submission) => (
                <Link
                  key={submission.submission_id}
                  href={`/artwork/${submission.artwork_id}`}
                  className="group block border border-[#DED4C5] bg-[#FCFAF6] p-4 transition hover:border-[#B87559]"
                >
                  <div className="overflow-hidden bg-[#DED4C5]">
                    <img
                      src={submission.image_url}
                      alt={submission.title}
                      className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <h3 className="mt-4 font-serif text-xl group-hover:text-[#B87559]">
                    {submission.title}
                  </h3>

                  <p className="mt-1 text-xs text-[#34312E]">
                    oleh <span className="font-medium">{submission.username}</span>
                  </p>

                  <p className="mt-1 text-[11px] text-[#77796B]">
                    Dikirim: {formatDateTime(submission.submitted_at)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-20 border-t border-[#DED4C5] pt-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#B87559]">
            Recognition
          </p>

          <h2 className="mt-3 font-serif text-3xl">
            Pemenang Challenge
          </h2>

          {winners.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#77796B]">
              Pemenang belum diumumkan.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {winners.map((winner) => (
                <Link
                  key={winner.winner_id}
                  href={`/artwork/${winner.artwork_id}`}
                  className="group block border border-[#DED4C5] bg-[#FCFAF6] p-4 transition hover:border-[#B87559]"
                >
                  <div className="overflow-hidden bg-[#DED4C5]">
                    <img
                      src={winner.image_url}
                      alt={winner.title}
                      className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <p className="mt-4 text-xs uppercase tracking-widest text-[#B87559]">
                    Juara {winner.rank}
                  </p>

                  <h3 className="mt-2 font-serif text-xl group-hover:text-[#B87559]">
                    {winner.title}
                  </h3>

                  <p className="mt-2 text-xs text-[#77796B]">
                    oleh {winner.username}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>

      <footer className="border-t border-[#DED4C5] px-6 py-8 text-center text-xs text-[#77796B]">
        SONDER — Every Piece Has a Story.
      </footer>
    </main>
  );
}
