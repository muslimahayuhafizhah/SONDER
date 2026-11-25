
"use client";

import { useCallback, useEffect, useState } from "react";

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

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

      // Tampilkan challenge milik Curator yang sedang login.
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

      setSubmissions(
        Array.isArray(submissionResult.data)
          ? submissionResult.data
          : []
      );

      setWinners(
        Array.isArray(winnerResult.data)
          ? winnerResult.data
          : []
      );
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

  async function handleSelectWinner(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!selectedChallenge || !selectedSubmission) {
      setError("Pilih karya yang akan menjadi pemenang.");
      return;
    }

    if (winners.length >= 3) {
      setError("Maksimal hanya 3 pemenang.");
      return;
    }

    if (
      winners.some(
        (winner) => Number(winner.rank) === Number(selectedRank)
      )
    ) {
      setError("Peringkat tersebut sudah memiliki pemenang.");
      return;
    }

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
            submission_id: Number(selectedSubmission),
            rank: Number(selectedRank),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menetapkan pemenang."
        );
      }

      setMessage("Pemenang berhasil diumumkan.");
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

  const announcedRanks = winners.map((winner) =>
    Number(winner.rank)
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

          <a
            href="/"
            className="text-sm text-[#77796B] underline underline-offset-4 hover:text-[#B87559]"
          >
            Kembali ke halaman utama
          </a>
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
            <p className="text-sm text-[#77796B]">Total Submission</p>
            <p className="mt-3 font-serif text-4xl">
              {submissions.length}
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
                            {status}
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
                            Lihat Submission
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
                Lengkapi informasi challenge sebelum dipublikasikan.
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

              <div>
                <label className="mb-2 block text-sm font-medium">
                  URL Banner
                </label>
                <input
                  type="url"
                  name="banner_url"
                  value={form.banner_url}
                  onChange={handleFormChange}
                  className={inputClass}
                  placeholder="https://example.com/banner.jpg"
                  required
                />
              </div>

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
                  disabled={saving}
                  className={`${buttonClass} bg-[#B87559] text-white hover:bg-[#9F6047]`}
                >
                  {saving
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
                  Challenge Detail
                </p>

                <h2 className="mt-2 font-serif text-3xl">
                  {selectedChallenge.title}
                </h2>

                <p className="mt-2 text-sm text-[#77796B]">
                  {formatDate(selectedChallenge.start_date)} –{" "}
                  {formatDate(selectedChallenge.end_date)}
                </p>
              </div>

              <button
                onClick={() => setActiveTab("challenges")}
                className={`${buttonClass} border border-[#DED4C5] bg-white`}
              >
                Kembali ke Challenge
              </button>
            </div>

            {detailLoading ? (
              <p className="py-12 text-center text-sm text-[#77796B]">
                Memuat submission...
              </p>
            ) : (
              <>
                {/* Submission List */}
                <div className="mb-10">
                  <h3 className="mb-5 font-serif text-2xl">
                    Karya yang Dikirim ({submissions.length})
                  </h3>

                  {submissions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#C9BBA8] px-6 py-12 text-center">
                      <p className="text-sm text-[#77796B]">
                        Belum ada karya yang dikirim ke challenge ini.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {submissions.map((submission) => (
                        <article
                          key={submission.submission_id}
                          className="overflow-hidden rounded-2xl border border-[#DED4C5] bg-white"
                        >
                          {submission.image_url && (
                            <img
                              src={submission.image_url}
                              alt={submission.title || "Karya peserta"}
                              className="h-52 w-full object-cover"
                            />
                          )}

                          <div className="p-5">
                            <h4 className="font-serif text-xl">
                              {submission.title || "Tanpa judul"}
                            </h4>

                            <p className="mt-2 text-sm text-[#77796B]">
                              Oleh: {submission.username || "Member"}
                            </p>

                            <p className="mt-1 text-xs text-[#77796B]">
                              Dikirim:{" "}
                              {formatDate(submission.submitted_at)}
                            </p>

                            {submission.status === "withdrawn" && (
                              <p className="mt-3 text-xs text-red-600">
                                Submission ditarik oleh Member
                              </p>
                            )}
                          </div>
                        </article>
                      ))}
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
                      Pilih maksimal tiga karya sebagai juara 1, 2, dan 3.
                    </p>
                  </div>

                  {winners.length > 0 && (
                    <div className="mb-7 grid gap-3 sm:grid-cols-3">
                      {[1, 2, 3].map((rank) => {
                        const winner = winners.find(
                          (item) => Number(item.rank) === rank
                        );

                        return (
                          <div
                            key={rank}
                            className="rounded-xl bg-[#F3EFE7] p-4"
                          >
                            <p className="text-xs uppercase tracking-wider text-[#B87559]">
                              Juara {rank}
                            </p>

                            <p className="mt-2 font-medium">
                              {winner
                                ? winner.title || "Karya terpilih"
                                : "Belum ditentukan"}
                            </p>

                            {winner && (
                              <p className="mt-1 text-xs text-[#77796B]">
                                {winner.username || "Member"}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!challengeEnded ? (
                    <p className="rounded-xl bg-[#F3EFE7] p-4 text-sm text-[#77796B]">
                      Pemilihan pemenang dapat dilakukan setelah
                      periode challenge berakhir.
                    </p>
                  ) : winners.length >= 3 ? (
                    <p className="rounded-xl bg-[#F3EFE7] p-4 text-sm text-[#77796B]">
                      Tiga pemenang sudah diumumkan.
                    </p>
                  ) : (
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
                        {[1, 2, 3]
                          .filter((rank) => !announcedRanks.includes(rank))
                          .map((rank) => (
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
                        {saving ? "Menyimpan..." : "Tetapkan"}
                      </button>
                    </form>
                  )}

                  {challengeEnded &&
                    winners.length < 3 &&
                    availableSubmissions.length === 0 && (
                      <p className="mt-3 text-xs text-[#77796B]">
                        Tidak ada submission aktif yang tersedia untuk dipilih.
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
