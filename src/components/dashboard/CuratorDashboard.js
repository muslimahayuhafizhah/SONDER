"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ImageUploader from "@/components/ImageUploader";

const emptyForm = {
  title: "",
  description: "",
  rules: "",
  reward: "",
  banner_url: "",
  start_date: "",
  end_date: "",
};

const inputClass =
  "w-full rounded-xl border border-[#DED4C5] bg-white px-4 py-3 text-sm text-[#34312E] outline-none transition focus:border-[#B87559]";

const buttonClass =
  "rounded-xl px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(date) {
  if (!date) return "-";

  const value = String(date).slice(0, 10);
  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function getChallengeStatus(challenge) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(`${String(challenge.start_date).slice(0, 10)}T00:00:00`);
  const end = new Date(`${String(challenge.end_date).slice(0, 10)}T00:00:00`);

  if (today < start) return "Akan datang";
  if (today > end) return "Berakhir";
  return "Sedang berlangsung";
}

export default function CuratorDashboard({ user }) {
  const [challenges, setChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [winners, setWinners] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState("");
  const [selectedRank, setSelectedRank] = useState("1");
  const [cardRanks, setCardRanks] = useState({});

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("challenges");

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/challenges", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memuat challenge.");
      }

      const allChallenges = Array.isArray(result.data)
        ? result.data
        : [];

      const myChallenges = allChallenges.filter(
        (challenge) =>
          Number(challenge.curator_id) === Number(user.user_id)
      );

      setChallenges(myChallenges);

      setSelectedChallenge((current) => {
        if (!current) return null;

        return (
          myChallenges.find(
            (item) =>
              Number(item.challenge_id) ===
              Number(current.challenge_id)
          ) || null
        );
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.user_id]);

  const loadChallengeDetail = useCallback(async (challengeId) => {
    if (!challengeId) return;

    setDetailLoading(true);
    setError("");

    try {
      const [submissionResponse, winnerResponse] = await Promise.all([
        fetch(`/api/challenges/${challengeId}/submissions`, {
          cache: "no-store",
        }),
        fetch(`/api/challenges/${challengeId}/winners`, {
          cache: "no-store",
        }),
      ]);

      const submissionResult = await submissionResponse.json();
      const winnerResult = await winnerResponse.json();

      if (!submissionResponse.ok || !submissionResult.success) {
        throw new Error(
          submissionResult.message || "Gagal memuat submission."
        );
      }

      if (!winnerResponse.ok || !winnerResult.success) {
        throw new Error(
          winnerResult.message || "Gagal memuat pemenang."
        );
      }

      const loadedSubmissions = Array.isArray(submissionResult.data)
        ? submissionResult.data
        : [];

      const loadedWinners = Array.isArray(winnerResult.data)
        ? winnerResult.data
        : [];

      setSubmissions(loadedSubmissions);
      setWinners(loadedWinners);

      // Sinkronkan pilihan peringkat yang masih tersedia
      const usedRanks = loadedWinners.map((w) => Number(w.rank));
      const nextAvailableRank = [1, 2, 3].find(
        (r) => !usedRanks.includes(r)
      );

      if (nextAvailableRank) {
        setSelectedRank(String(nextAvailableRank));
      }
    } catch (err) {
      setError(err.message);
      setSubmissions([]);
      setWinners([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  useEffect(() => {
    if (selectedChallenge) {
      loadChallengeDetail(selectedChallenge.challenge_id);
    } else {
      setSubmissions([]);
      setWinners([]);
    }
  }, [selectedChallenge, loadChallengeDetail]);

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(challenge) {
    setForm({
      title: challenge.title || "",
      description: challenge.description || "",
      rules: challenge.rules || "",
      reward: challenge.reward || "",
      banner_url: challenge.banner_url || "",
      start_date: String(challenge.start_date).slice(0, 10),
      end_date: String(challenge.end_date).slice(0, 10),
    });

    setEditingId(challenge.challenge_id);
    setActiveTab("form");
    setMessage("");
    setError("");
  }

  async function handleChallengeSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (uploadingBanner) {
      setError("Mohon tunggu hingga proses unggah banner selesai.");
      return;
    }

    if (!form.banner_url) {
      setError("Silakan pilih dan unggah gambar banner challenge terlebih dahulu.");
      return;
    }

    if (form.end_date <= form.start_date) {
      setError("Tanggal selesai harus setelah tanggal mulai.");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/api/challenges/${editingId}`
        : "/api/challenges";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Challenge gagal disimpan."
        );
      }

      setMessage(
        editingId
          ? "Challenge berhasil diperbarui."
          : "Challenge berhasil dibuat."
      );

      resetForm();
      await loadChallenges();
      setActiveTab("challenges");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteChallenge(challengeId) {
    const confirmed = window.confirm(
      "Yakin ingin menghapus challenge ini beserta submission dan datanya?"
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/challenges/${challengeId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Challenge gagal dihapus."
        );
      }

      setSelectedChallenge(null);
      setMessage("Challenge berhasil dihapus.");
      await loadChallenges();
    } catch (err) {
      setError(err.message);
    }
  }

  async function assignWinner(submissionId, rankValue) {
    setMessage("");
    setError("");

    if (!selectedChallenge) {
      setError("Pilih challenge terlebih dahulu.");
      return;
    }

    const isOwner =
      Number(selectedChallenge.curator_id) === Number(user.user_id) &&
      user.role === "curator" &&
      user.curator_status === "approved";

    if (!isOwner) {
      setError("Hanya Curator pemilik challenge yang sudah disetujui yang dapat memilih pemenang.");
      return;
    }

    if (getChallengeStatus(selectedChallenge) !== "Berakhir") {
      setError("Pemilihan pemenang hanya dapat dilakukan setelah periode challenge berakhir.");
      return;
    }

    const subNum = Number(submissionId);
    const rankNum = Number(rankValue);

    if (!subNum || ![1, 2, 3].includes(rankNum)) {
      setError("Pilih karya peserta dan peringkat Juara (1, 2, atau 3) yang valid.");
      return;
    }

    if (winners.length >= 3) {
      setError("Maksimal hanya 3 pemenang untuk setiap challenge.");
      return;
    }

    if (winners.some((w) => Number(w.rank) === rankNum)) {
      setError(`Peringkat Juara ${rankNum} sudah memiliki pemenang.`);
      return;
    }

    if (winners.some((w) => Number(w.submission_id) === subNum)) {
      setError("Karya ini sudah ditetapkan sebagai pemenang.");
      return;
    }

    const targetSubmission = submissions.find(
      (s) => Number(s.submission_id) === subNum
    );

    const artworkTitle = targetSubmission?.title || "Karya terpilih";
    const creatorName = targetSubmission?.username || "Member";

    const confirmed = window.confirm(
      `Yakin ingin mengumumkan "${artworkTitle}" oleh ${creatorName} sebagai Juara ${rankNum} pada challenge "${selectedChallenge.title}"?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const response = await fetch(
        `/api/challenges/${selectedChallenge.challenge_id}/winners`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submission_id: subNum,
            rank: rankNum,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menetapkan pemenang."
        );
      }

      setMessage(
        result.message ||
          `Pemenang Juara ${rankNum} berhasil diumumkan.`
      );
      setSelectedSubmission("");

      await loadChallengeDetail(
        selectedChallenge.challenge_id
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectWinner(event) {
    event.preventDefault();
    await assignWinner(selectedSubmission, selectedRank);
  }

  const announcedRanks = winners.map((winner) =>
    Number(winner.rank)
  );

  const remainingRanks = [1, 2, 3].filter(
    (rank) => !announcedRanks.includes(rank)
  );

  const availableSubmissions = submissions.filter(
    (submission) =>
      submission.status !== "withdrawn" &&
      !winners.some(
        (winner) =>
          Number(winner.submission_id) ===
          Number(submission.submission_id)
      )
  );

  const isChallengeOwner =
    selectedChallenge &&
    Number(selectedChallenge.curator_id) === Number(user.user_id) &&
    user.role === "curator" &&
    user.curator_status === "approved";

  const challengeEnded =
    selectedChallenge &&
    getChallengeStatus(selectedChallenge) === "Berakhir";

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-10">
        {/* Header */}
        <header className="mb-10 flex flex-col justify-between gap-5 border-b border-[#DED4C5] pb-8 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[#B87559]">
              SONDER · Curator Space
            </p>

            <h1 className="font-serif text-4xl md:text-5xl">
              Halo, {user.username}.
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-[#77796B]">
              Kelola challenge, lihat karya yang dikirimkan,
              dan apresiasi karya-karya terbaik dari komunitas.
            </p>
          </div>

          <Link
            href="/"
            className="text-sm text-[#77796B] underline underline-offset-4 hover:text-[#B87559]"
          >
            Kembali ke halaman utama
          </Link>
        </header>

        {/* Summary */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#DED4C5] bg-white p-6">
            <p className="text-sm text-[#77796B]">Total Challenge</p>
            <p className="mt-3 font-serif text-4xl">
              {challenges.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#DED4C5] bg-white p-6">
            <p className="text-sm text-[#77796B]">
              {selectedChallenge
                ? "Submission Challenge Terpilih"
                : "Total Seluruh Submission"}
            </p>
            <p className="mt-3 font-serif text-4xl">
              {selectedChallenge
                ? submissions.length
                : challenges.reduce(
                    (acc, item) => acc + Number(item.total_submissions || 0),
                    0
                  )}
            </p>
          </div>

          <div className="rounded-2xl border border-[#DED4C5] bg-white p-6">
            <p className="text-sm text-[#77796B]">Pemenang Diumumkan</p>
            <p className="mt-3 font-serif text-4xl">
              {winners.length}/3
            </p>
          </div>
        </section>

        {/* Messages */}
        {message && (
          <div className="mb-5 rounded-xl border border-[#77796B]/30 bg-white px-5 py-3 text-sm text-[#555C49]">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Navigation */}
        <nav className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setActiveTab("challenges");
              setMessage("");
              setError("");
            }}
            className={`${buttonClass} ${
              activeTab === "challenges"
                ? "bg-[#34312E] text-white"
                : "border border-[#DED4C5] bg-white"
            }`}
          >
            Challenge Saya
          </button>

          <button
            onClick={() => {
              resetForm();
              setActiveTab("form");
              setMessage("");
              setError("");
            }}
            className={`${buttonClass} ${
              activeTab === "form"
                ? "bg-[#34312E] text-white"
                : "border border-[#DED4C5] bg-white"
            }`}
          >
            Buat Challenge
          </button>

          {selectedChallenge && (
            <button
              onClick={() => {
                setActiveTab("submissions");
                setMessage("");
                setError("");
              }}
              className={`${buttonClass} ${
                activeTab === "submissions"
                  ? "bg-[#34312E] text-white"
                  : "border border-[#DED4C5] bg-white"
              }`}
            >
              Submission & Pemenang
            </button>
          )}
        </nav>

        {/* Challenge List */}
        {activeTab === "challenges" && (
          <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl">
                  Challenge Saya
                </h2>
                <p className="mt-1 text-sm text-[#77796B]">
                  Semua challenge yang kamu kelola.
                </p>
              </div>

              <button
                onClick={() => {
                  resetForm();
                  setActiveTab("form");
                }}
                className={`${buttonClass} bg-[#B87559] text-white hover:bg-[#9F6047]`}
              >
                + Buat Challenge
              </button>
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-[#77796B]">
                Memuat challenge...
              </p>
            ) : challenges.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#C9BBA8] bg-white/60 px-6 py-16 text-center">
                <h3 className="font-serif text-2xl">
                  Belum ada challenge
                </h3>
                <p className="mt-2 text-sm text-[#77796B]">
                  Mulai buat challenge pertamamu untuk komunitas SONDER.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {challenges.map((challenge) => {
                  const status = getChallengeStatus(challenge);
                  const isSelected =
                    Number(selectedChallenge?.challenge_id) ===
                    Number(challenge.challenge_id);

                  return (
                    <article
                      key={challenge.challenge_id}
                      className={`overflow-hidden rounded-2xl border bg-white ${
                        isSelected
                          ? "border-[#B87559]"
                          : "border-[#DED4C5]"
                      }`}
                    >
                      {challenge.banner_url && (
                        <img
                          src={challenge.banner_url}
                          alt={challenge.title}
                          className="h-48 w-full object-cover"
                        />
                      )}

                      <div className="p-6">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full bg-[#F3EFE7] px-3 py-1 text-xs text-[#77796B]">
                            {status} · {challenge.total_submissions || 0} peserta
                          </span>

                          <span className="text-xs text-[#77796B]">
                            {formatDate(challenge.start_date)} –{" "}
                            {formatDate(challenge.end_date)}
                          </span>
                        </div>

                        <h3 className="font-serif text-2xl">
                          {challenge.title}
                        </h3>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#77796B]">
                          {challenge.description}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setSelectedChallenge(challenge);
                              setActiveTab("submissions");
                              setMessage("");
                              setError("");
                            }}
                            className={`${buttonClass} bg-[#34312E] text-white hover:bg-[#514B45]`}
                          >
                            Lihat Submission & Pemenang ({challenge.total_submissions || 0})
                          </button>

                          <button
                            onClick={() => startEdit(challenge)}
                            className={`${buttonClass} border border-[#DED4C5] hover:bg-[#F3EFE7]`}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteChallenge(
                                challenge.challenge_id
                              )
                            }
                            className={`${buttonClass} border border-red-200 text-red-700 hover:bg-red-50`}
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Create / Edit Form */}
        {activeTab === "form" && (
          <section className="mx-auto max-w-3xl rounded-2xl border border-[#DED4C5] bg-white p-6 md:p-9">
            <div className="mb-7">
              <p className="text-xs uppercase tracking-[0.2em] text-[#B87559]">
                {editingId ? "Edit Challenge" : "New Challenge"}
              </p>

              <h2 className="mt-2 font-serif text-3xl">
                {editingId
                  ? "Perbarui Challenge"
                  : "Buat Challenge Baru"}
              </h2>

              <p className="mt-2 text-sm text-[#77796B]">
                Lengkapi informasi challenge dan unggah gambar banner sebelum dipublikasikan.
              </p>
            </div>

            <form onSubmit={handleChallengeSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Judul Challenge
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  className={inputClass}
                  placeholder="Contoh: A World Through My Lens"
                  required
                  maxLength={150}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Deskripsi
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  className={inputClass}
                  rows={4}
                  placeholder="Ceritakan tema dan tujuan challenge..."
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Aturan Challenge
                </label>
                <textarea
                  name="rules"
                  value={form.rules}
                  onChange={handleFormChange}
                  className={inputClass}
                  rows={4}
                  placeholder="Tuliskan aturan dan ketentuan..."
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Hadiah
                </label>
                <textarea
                  name="reward"
                  value={form.reward}
                  onChange={handleFormChange}
                  className={inputClass}
                  rows={2}
                  placeholder="Jelaskan hadiah untuk pemenang..."
                  required
                />
              </div>

              <ImageUploader
                uploadType="banner"
                label="Banner Challenge"
                value={form.banner_url}
                onChange={(url) =>
                  setForm((current) => ({
                    ...current,
                    banner_url: url,
                  }))
                }
                onUploadingChange={setUploadingBanner}
                required
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleFormChange}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleFormChange}
                    className={inputClass}
                    min={form.start_date || undefined}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-3">
                <button
                  type="submit"
                  disabled={saving || uploadingBanner}
                  className={`${buttonClass} bg-[#B87559] text-white hover:bg-[#9F6047]`}
                >
                  {uploadingBanner
                    ? "Mengunggah Banner..."
                    : saving
                    ? "Menyimpan..."
                    : editingId
                    ? "Simpan Perubahan"
                    : "Publikasikan Challenge"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab("challenges");
                    setError("");
                    setMessage("");
                  }}
                  className={`${buttonClass} border border-[#DED4C5]`}
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Submissions and Winners */}
        {activeTab === "submissions" && selectedChallenge && (
          <section>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#B87559]">
                  Challenge Detail · {getChallengeStatus(selectedChallenge)}
                </p>

                <h2 className="mt-2 font-serif text-3xl">
                  {selectedChallenge.title}
                </h2>

                <p className="mt-2 text-sm text-[#77796B]">
                  Periode: {formatDate(selectedChallenge.start_date)} –{" "}
                  {formatDate(selectedChallenge.end_date)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/challenges/${selectedChallenge.challenge_id}`}
                  className={`${buttonClass} border border-[#34312E] bg-transparent text-[#34312E] hover:bg-[#34312E] hover:text-white`}
                >
                  Lihat Halaman Publik Challenge ↗
                </Link>

                <button
                  onClick={() => setActiveTab("challenges")}
                  className={`${buttonClass} border border-[#DED4C5] bg-white`}
                >
                  Kembali ke Challenge
                </button>
              </div>
            </div>

            {detailLoading ? (
              <p className="py-12 text-center text-sm text-[#77796B]">
                Memuat submission...
              </p>
            ) : (
              <>
                {/* Submission List */}
                <div className="mb-10">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-serif text-2xl">
                      Karya yang Dikirim ({submissions.length})
                    </h3>

                    {!challengeEnded ? (
                      <span className="rounded-full bg-[#DED4C5] px-4 py-1.5 text-xs text-[#34312E]">
                        Pemilihan pemenang dibuka setelah tanggal{" "}
                        {formatDate(selectedChallenge.end_date)}
                      </span>
                    ) : winners.length >= 3 ? (
                      <span className="rounded-full bg-[#77796B] px-4 py-1.5 text-xs text-[#F3EFE7]">
                        Ketiga pemenang (Juara 1, 2, 3) telah diumumkan
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#B87559]/15 px-4 py-1.5 text-xs font-medium text-[#B87559]">
                        Challenge telah berakhir · Silakan pilih pemenang ({winners.length}/3 terpilih)
                      </span>
                    )}
                  </div>

                  {submissions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#C9BBA8] px-6 py-12 text-center">
                      <p className="text-sm text-[#77796B]">
                        Belum ada karya yang dikirim ke challenge ini.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {submissions.map((submission) => {
                        const winnerEntry = winners.find(
                          (w) =>
                            Number(w.submission_id) ===
                            Number(submission.submission_id)
                        );

                        const currentCardRank =
                          cardRanks[submission.submission_id] &&
                          remainingRanks.includes(
                            Number(cardRanks[submission.submission_id])
                          )
                            ? String(cardRanks[submission.submission_id])
                            : String(remainingRanks[0] || "1");

                        return (
                          <article
                            key={submission.submission_id}
                            className={`flex flex-col justify-between overflow-hidden rounded-2xl border bg-white ${
                              winnerEntry
                                ? "border-2 border-[#B87559]"
                                : "border-[#DED4C5]"
                            }`}
                          >
                            <div>
                              <div className="relative">
                                {submission.image_url && (
                                  <img
                                    src={submission.image_url}
                                    alt={submission.title || "Karya peserta"}
                                    className="h-52 w-full object-cover"
                                  />
                                )}

                                {winnerEntry && (
                                  <span className="absolute left-3 top-3 rounded-full bg-[#B87559] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#F3EFE7] shadow">
                                    ★ Pemenang Juara {winnerEntry.rank}
                                  </span>
                                )}
                              </div>

                              <div className="p-5">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-serif text-xl">
                                    {submission.title || "Tanpa judul"}
                                  </h4>

                                  <Link
                                    href={`/artwork/${submission.artwork_id}`}
                                    className="text-xs text-[#B87559] underline underline-offset-4"
                                  >
                                    Detail ↗
                                  </Link>
                                </div>

                                <p className="mt-2 text-sm text-[#77796B]">
                                  Oleh:{" "}
                                  <span className="font-medium text-[#34312E]">
                                    {submission.username || "Member"}
                                  </span>
                                </p>

                                <p className="mt-1 text-xs text-[#77796B]">
                                  Dikirim:{" "}
                                  {formatDate(submission.submitted_at)}
                                </p>

                                {winnerEntry && (
                                  <div className="mt-4 rounded-xl bg-[#F3EFE7] px-3.5 py-2.5 text-xs font-medium text-[#B87559]">
                                    ✓ Ditetapkan sebagai Juara {winnerEntry.rank}
                                  </div>
                                )}

                                {submission.status === "withdrawn" && (
                                  <p className="mt-3 text-xs text-red-600">
                                    Submission ditarik oleh Member
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Tombol Pemilihan Pemenang Langsung pada Kartu Submission */}
                            {isChallengeOwner &&
                              !winnerEntry &&
                              submission.status === "active" && (
                                <div className="border-t border-[#DED4C5] bg-[#FCFAF6] p-4">
                                  {challengeEnded &&
                                  remainingRanks.length > 0 ? (
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={currentCardRank}
                                        onChange={(e) =>
                                          setCardRanks((prev) => ({
                                            ...prev,
                                            [submission.submission_id]:
                                              e.target.value,
                                          }))
                                        }
                                        disabled={saving}
                                        className="rounded-xl border border-[#DED4C5] bg-white px-3 py-2 text-xs text-[#34312E] outline-none focus:border-[#B87559]"
                                      >
                                        {remainingRanks.map((rank) => (
                                          <option key={rank} value={rank}>
                                            Juara {rank}
                                          </option>
                                        ))}
                                      </select>

                                      <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() =>
                                          assignWinner(
                                            submission.submission_id,
                                            currentCardRank
                                          )
                                        }
                                        className="flex-1 rounded-xl bg-[#34312E] px-3 py-2 text-xs font-medium text-[#F3EFE7] transition hover:bg-[#B87559] disabled:opacity-50"
                                      >
                                        {saving
                                          ? "Memproses..."
                                          : "Jadikan Pemenang"}
                                      </button>
                                    </div>
                                  ) : !challengeEnded ? (
                                    <p className="text-center text-[11px] text-[#77796B]">
                                      Tersedia untuk dipilih setelah challenge berakhir
                                    </p>
                                  ) : (
                                    <p className="text-center text-[11px] text-[#77796B]">
                                      Kuota 3 pemenang sudah terpenuhi
                                    </p>
                                  )}
                                </div>
                              )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Winner Section */}
                <div className="rounded-2xl border border-[#DED4C5] bg-white p-6 md:p-8">
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#B87559]">
                      Winner Announcement
                    </p>

                    <h3 className="mt-2 font-serif text-2xl">
                      Pemenang Challenge
                    </h3>

                    <p className="mt-2 text-sm text-[#77796B]">
                      Daftar resmi pemenang Juara 1, 2, dan 3 yang diumumkan pada halaman Challenge Detail.
                    </p>
                  </div>

                  <div className="mb-7 grid gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map((rank) => {
                      const winner = winners.find(
                        (item) => Number(item.rank) === rank
                      );

                      return (
                        <div
                          key={rank}
                          className={`rounded-xl border p-4 ${
                            winner
                              ? "border-[#B87559] bg-[#F3EFE7]"
                              : "border-[#DED4C5] bg-[#FCFAF6]"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#B87559]">
                            Juara {rank}
                          </p>

                          {winner ? (
                            <div className="mt-3">
                              {winner.image_url && (
                                <img
                                  src={winner.image_url}
                                  alt={winner.title}
                                  className="mb-3 h-32 w-full rounded-lg object-cover"
                                />
                              )}
                              <p className="font-serif text-lg font-medium">
                                {winner.title || "Karya terpilih"}
                              </p>
                              <p className="mt-1 text-xs text-[#77796B]">
                                oleh {winner.username || "Member"}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm italic text-[#77796B]">
                              Belum ditentukan
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!challengeEnded ? (
                    <p className="rounded-xl bg-[#F3EFE7] p-4 text-sm text-[#77796B]">
                      Pemilihan pemenang dapat dilakukan setelah
                      periode challenge berakhir ({formatDate(selectedChallenge.end_date)}).
                    </p>
                  ) : winners.length >= 3 ? (
                    <p className="rounded-xl bg-[#F3EFE7] p-4 text-sm text-[#555C49]">
                      ✓ Ketiga pemenang sudah diumumkan dan ditampilkan di halaman Challenge Detail.
                    </p>
                  ) : (
                    isChallengeOwner && (
                      <form
                        onSubmit={handleSelectWinner}
                        className="grid gap-4 md:grid-cols-[1fr_180px_auto]"
                      >
                        <select
                          value={selectedSubmission}
                          onChange={(event) =>
                            setSelectedSubmission(event.target.value)
                          }
                          className={inputClass}
                          required
                        >
                          <option value="">Pilih karya peserta</option>

                          {availableSubmissions.map((submission) => (
                            <option
                              key={submission.submission_id}
                              value={submission.submission_id}
                            >
                              {submission.title} — {submission.username}
                            </option>
                          ))}
                        </select>

                        <select
                          value={selectedRank}
                          onChange={(event) =>
                            setSelectedRank(event.target.value)
                          }
                          className={inputClass}
                        >
                          {remainingRanks.map((rank) => (
                            <option key={rank} value={rank}>
                              Juara {rank}
                            </option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          disabled={
                            saving ||
                            availableSubmissions.length === 0
                          }
                          className={`${buttonClass} bg-[#B87559] text-white hover:bg-[#9F6047]`}
                        >
                          {saving ? "Menyimpan..." : "Pilih Pemenang"}
                        </button>
                      </form>
                    )
                  )}

                  {challengeEnded &&
                    winners.length < 3 &&
                    availableSubmissions.length === 0 && (
                      <p className="mt-3 text-xs text-[#77796B]">
                        Tidak ada submission aktif tersisa yang dapat dipilih sebagai pemenang.
                      </p>
                    )}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
