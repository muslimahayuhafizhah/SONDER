
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ChallengeDetailPage() {
  const { id } = useParams();

  const [challenge, setChallenge] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [winners, setWinners] = useState([]);
  const [myArtworks, setMyArtworks] = useState([]);
  const [selectedArtwork, setSelectedArtwork] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function getChallengeDetail() {
      try {
        const [challengeRes, submissionRes, winnerRes, userRes] =
          await Promise.all([
            fetch(`/api/challenges/${id}`, { cache: "no-store" }),
            fetch(`/api/challenges/${id}/submissions`, {
              cache: "no-store",
            }),
            fetch(`/api/challenges/${id}/winners`, {
              cache: "no-store",
            }),
            fetch("/api/me", { cache: "no-store" }),
          ]);

        const challengeData = await challengeRes.json();
        const submissionData = await submissionRes.json();
        const winnerData = await winnerRes.json();
        const userData = await userRes.json();

        if (!challengeRes.ok || !challengeData.success) {
          throw new Error("Challenge tidak ditemukan.");
        }

        if (!submissionRes.ok || !submissionData.success) {
          throw new Error("Gagal mengambil daftar peserta.");
        }

        if (!winnerRes.ok || !winnerData.success) {
          throw new Error("Gagal mengambil daftar pemenang.");
        }

        setChallenge(challengeData.data);
        setSubmissions(submissionData.data || []);
        setWinners(winnerData.data || []);

        if (userRes.ok && userData.success) {
          setUser(userData.data);

          if (userData.data.role === "member") {
            const artworkRes = await fetch("/api/artworks", {
              cache: "no-store",
            });

            const artworkData = await artworkRes.json();

            if (artworkRes.ok && artworkData.success) {
              setMyArtworks(
                (artworkData.data || []).filter(
                  (artwork) =>
                    artwork.user_id === userData.data.user_id &&
                    artwork.status !== "taken_down"
                )
              );
            }
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) getChallengeDetail();
  }, [id]);

  function formatDate(date) {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getStatus() {
    if (!challenge) return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);

    if (today < start) return "Segera Dibuka";
    if (today > end) return "Selesai";
    return "Sedang Berlangsung";
  }

  async function handleSubmitArtwork() {
    if (!selectedArtwork) {
      setMessage("Pilih karya terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    setMessage("");

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
        throw new Error(result.message || "Gagal mengirim karya.");
      }

      setMessage("Karya berhasil dikirim ke challenge!");
      setSelectedArtwork("");

      const updated = await fetch(
        `/api/challenges/${id}/submissions`,
        { cache: "no-store" }
      );

      const updatedData = await updated.json();

      if (updated.ok && updatedData.success) {
        setSubmissions(updatedData.data || []);
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(submissionId) {
    const confirmed = window.confirm(
      "Yakin ingin menarik karya dari challenge ini?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/challenges/${id}/submissions`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submission_id: submissionId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menarik karya.");
      }

      setMessage("Karya berhasil ditarik.");

      setSubmissions((current) =>
        current.filter(
          (submission) => submission.submission_id !== submissionId
        )
      );
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (loading) {
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
        <p className="mt-3 text-sm text-[#77796B]">{error}</p>
        <Link href="/challenges" className="mt-6 text-[#B87559] underline">
          Kembali ke Challenges
        </Link>
      </main>
    );
  }

  const isActive = getStatus() === "Sedang Berlangsung";

  const mySubmission = submissions.find(
    (submission) => submission.user_id === user?.user_id
  );

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <nav className="flex items-center justify-between border-b border-[#DED4C5] px-6 py-5 md:px-12">
        <Link href="/" className="font-serif text-2xl font-semibold">
          SONDER
        </Link>

        <div className="flex gap-6 text-sm">
          <Link href="/">Home</Link>
          <Link href="/explore">Explore</Link>
          <Link href="/challenges" className="text-[#B87559]">
            Challenges
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:px-12">
        <Link
          href="/challenges"
          className="text-xs uppercase tracking-widest text-[#77796B]"
        >
          ← Kembali ke Challenges
        </Link>

        <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-center">
          <div className="overflow-hidden bg-[#DED4C5]">
            {challenge.banner_url ? (
              <img
                src={challenge.banner_url}
                alt={challenge.title}
                className="h-80 w-full object-cover"
              />
            ) : (
              <div className="flex h-80 items-center justify-center bg-[#77796B] font-serif text-4xl text-[#F3EFE7]">
                SONDER
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#B87559]">
              {getStatus()}
            </p>

            <h1 className="mt-5 font-serif text-4xl leading-tight md:text-5xl">
              {challenge.title}
            </h1>

            <p className="mt-5 text-sm leading-7 text-[#77796B]">
              {challenge.description}
            </p>

            <div className="mt-8 border-t border-[#DED4C5] pt-5">
              <p className="text-xs uppercase tracking-widest text-[#B87559]">
                Periode Challenge
              </p>
              <p className="mt-2 text-sm">
                {formatDate(challenge.start_date)} —{" "}
                {formatDate(challenge.end_date)}
              </p>
            </div>

            <div className="mt-6 border-t border-[#DED4C5] pt-5">
              <p className="text-xs uppercase tracking-widest text-[#B87559]">
                Reward
              </p>
              <p className="mt-2 text-sm leading-6">{challenge.reward}</p>
            </div>
          </div>
        </div>

        <section className="mt-20 border-t border-[#DED4C5] pt-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#B87559]">
            Before You Join
          </p>
          <h2 className="mt-3 font-serif text-3xl">Aturan Challenge</h2>
          <p className="mt-6 whitespace-pre-line text-sm leading-8 text-[#77796B]">
            {challenge.rules}
          </p>
        </section>

        {user?.role === "member" && isActive && (
          <section className="mt-16 border border-[#DED4C5] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[#B87559]">
              Join The Challenge
            </p>

            <h2 className="mt-3 font-serif text-3xl">
              Kirim Karyamu
            </h2>

            {mySubmission ? (
              <div className="mt-6">
                <p className="text-sm text-[#77796B]">
                  Kamu sudah mengirim satu karya untuk challenge ini.
                </p>

                <button
                  onClick={() =>
                    handleWithdraw(mySubmission.submission_id)
                  }
                  className="mt-5 border border-[#B87559] px-5 py-3 text-xs uppercase tracking-widest text-[#B87559] hover:bg-[#B87559] hover:text-white"
                >
                  Tarik Karya
                </button>
              </div>
            ) : myArtworks.length === 0 ? (
              <p className="mt-5 text-sm text-[#77796B]">
                Kamu belum memiliki karya. Unggah karya terlebih dahulu
                sebelum mengikuti challenge.
              </p>
            ) : (
              <div className="mt-6">
                <label className="mb-3 block text-sm">
                  Pilih karya yang ingin dikirim
                </label>

                <select
                  value={selectedArtwork}
                  onChange={(e) => setSelectedArtwork(e.target.value)}
                  className="w-full border border-[#DED4C5] bg-transparent px-4 py-3 text-sm outline-none focus:border-[#B87559]"
                >
                  <option value="">Pilih karya</option>
                  {myArtworks.map((artwork) => (
                    <option
                      key={artwork.artwork_id}
                      value={artwork.artwork_id}
                    >
                      {artwork.title}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleSubmitArtwork}
                  disabled={submitting}
                  className="mt-5 bg-[#34312E] px-6 py-3 text-xs uppercase tracking-widest text-[#F3EFE7] hover:bg-[#B87559] disabled:opacity-50"
                >
                  {submitting ? "Mengirim..." : "Submit Artwork"}
                </button>
              </div>
            )}

            {message && (
              <p className="mt-5 text-sm text-[#B87559]">{message}</p>
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
                  className="group"
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

                  <p className="mt-2 text-xs text-[#77796B]">
                    by {submission.username}
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
                  className="group"
                >
                  <div className="overflow-hidden bg-[#DED4C5]">
                    <img
                      src={winner.image_url}
                      alt={winner.title}
                      className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <p className="mt-4 text-xs uppercase tracking-widest text-[#B87559]">
                    Rank {winner.rank}
                  </p>

                  <h3 className="mt-2 font-serif text-xl">
                    {winner.title}
                  </h3>

                  <p className="mt-2 text-xs text-[#77796B]">
                    by {winner.username}
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
