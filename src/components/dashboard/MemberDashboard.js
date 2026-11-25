"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function MemberDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("artworks");

  const [artworks, setArtworks] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    bio: user?.bio || "",
    profile_image: user?.profile_image || "",
    external_link: user?.external_link || "",
    new_password: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const tabs = [
    { id: "artworks", label: "Karya Saya" },
    { id: "favorites", label: "Favorit Saya" },
    { id: "submissions", label: "Submisi Challenge" },
    { id: "profile", label: "Profil & Akun" },
  ];

  const loadMemberData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [artRes, favRes, profRes] = await Promise.all([
        fetch("/api/artworks", { cache: "no-store" }),
        fetch("/api/favorites", { cache: "no-store" }),
        fetch("/api/profile", { cache: "no-store" }),
      ]);

      const [artResult, favResult, profResult] = await Promise.all([
        artRes.json(),
        favRes.json(),
        profRes.json(),
      ]);

      if (artRes.ok && artResult.success) {
        const myArtworks = (artResult.data || []).filter(
          (artwork) => Number(artwork.user_id) === Number(user.user_id)
        );
        setArtworks(myArtworks);
      }

      if (favRes.ok && favResult.success) {
        setFavorites(favResult.data || []);
      }

      if (profRes.ok && profResult.success) {
        const u = profResult.data?.user || user;
        setSubmissions(profResult.data?.submissions || []);
        setProfileForm({
          username: u.username || "",
          email: u.email || "",
          bio: u.bio || "",
          profile_image: u.profile_image || "",
          external_link: u.external_link || "",
          new_password: "",
        });
      }
    } catch (err) {
      setError(err.message || "Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMemberData();
  }, [loadMemberData]);

  async function handleDeleteArtwork(id) {
    const confirmed = window.confirm(
      "Yakin ingin menghapus karya ini?"
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/artworks/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const reason =
          result.message ||
          "Karya tidak dapat dihapus saat ini.";
        throw new Error(reason);
      }

      setArtworks((current) =>
        current.filter((artwork) => artwork.artwork_id !== id)
      );

      setMessage(result.message || "Karya berhasil dihapus.");
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleRemoveFavorite(artworkId) {
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/favorites?artwork_id=${artworkId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menghapus dari favorit.");
      }

      setFavorites((current) =>
        current.filter((item) => item.artwork_id !== artworkId)
      );

      setMessage("Karya dihapus dari daftar favorit.");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setSavingProfile(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memperbarui profil.");
      }

      setProfileForm((prev) => ({ ...prev, new_password: "" }));
      setMessage(result.message || "Profil berhasil diperbarui.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <section className="mx-auto max-w-7xl px-6 py-14 md:px-12">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.25em] text-[#B87559]">
              Member Dashboard
            </p>

            <h1 className="mb-3 font-serif text-4xl md:text-5xl">
              Welcome, {profileForm.username || user.username}.
            </h1>

            <p className="text-[#77796B]">
              Kelola karya, daftar favorit, submisi challenge, dan profil kreatifmu di SONDER.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/creators/${user.user_id}`}
              className="border border-[#34312E] px-5 py-3 text-sm transition hover:bg-[#34312E] hover:text-[#F3EFE7]"
            >
              Lihat Profil Publik
            </Link>

            <Link
              href="/artwork/create"
              className="bg-[#34312E] px-6 py-3 text-sm text-[#F3EFE7] transition hover:bg-[#B87559]"
            >
              + Tambah Karya
            </Link>
          </div>
        </div>

        {/* Ringkasan Statistik Member */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-[#DED4C5] p-7">
            <p className="mb-3 text-sm text-[#77796B]">Total Karya</p>
            <p className="font-serif text-4xl">{artworks.length}</p>
          </div>

          <div className="bg-[#DED4C5] p-7">
            <p className="mb-3 text-sm text-[#77796B]">Karya Favorit</p>
            <p className="font-serif text-4xl">{favorites.length}</p>
          </div>

          <div className="bg-[#DED4C5] p-7">
            <p className="mb-3 text-sm text-[#77796B]">Submisi Challenge</p>
            <p className="font-serif text-4xl">{submissions.length}</p>
          </div>
        </div>

        {/* Navigasi Tab */}
        <div className="mb-8 flex gap-3 overflow-x-auto border-b border-[#DED4C5]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setMessage("");
                setError("");
              }}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm transition ${
                activeTab === tab.id
                  ? "border-[#B87559] text-[#B87559]"
                  : "border-transparent text-[#77796B] hover:text-[#34312E]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {message && (
          <div className="mb-6 bg-[#DED4C5] px-5 py-4 text-sm text-[#34312E]">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 border-l-2 border-[#B87559] bg-[#B87559]/10 px-5 py-4 text-sm text-[#8B4935]">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-12 text-[#77796B]">Memuat data dashboard...</p>
        ) : (
          <>
            {/* TAB 1: KARYA SAYA */}
            {activeTab === "artworks" && (
              <section>
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#77796B]">
                      Your Collection
                    </p>
                    <h2 className="font-serif text-3xl">Karya Saya</h2>
                  </div>

                  <span className="text-sm text-[#77796B]">
                    {artworks.length} karya
                  </span>
                </div>

                {artworks.length === 0 ? (
                  <div className="border border-dashed border-[#B8AA98] p-12 text-center">
                    <h3 className="mb-3 font-serif text-2xl">
                      Belum ada karya di sini.
                    </h3>

                    <p className="mb-6 text-sm text-[#77796B]">
                      Mulai bagikan sesuatu yang punya cerita.
                    </p>

                    <Link
                      href="/artwork/create"
                      className="inline-block bg-[#34312E] px-6 py-3 text-sm text-[#F3EFE7]"
                    >
                      Tambahkan Karya Pertama
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {artworks.map((artwork) => {
                      const winningInfo = submissions.find(
                        (sub) =>
                          Number(sub.artwork_id) ===
                            Number(artwork.artwork_id) && sub.winner_rank
                      );

                      return (
                        <article key={artwork.artwork_id} className="group">
                          <Link href={`/artwork/${artwork.artwork_id}`}>
                            <div className="relative mb-4 aspect-[4/5] overflow-hidden bg-[#DED4C5]">
                              <img
                                src={artwork.image_url}
                                alt={artwork.title}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                              {winningInfo && (
                                <span className="absolute left-3 top-3 bg-[#B87559] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#F3EFE7]">
                                  ★ Juara {winningInfo.winner_rank} · {winningInfo.challenge_title}
                                </span>
                              )}
                            </div>

                            <p className="mb-2 text-xs uppercase tracking-widest text-[#B87559]">
                              {artwork.category_name || "Artwork"} · ♡{" "}
                              {artwork.total_likes || 0}
                            </p>

                            <h3 className="mb-2 font-serif text-xl">
                              {artwork.title}
                            </h3>
                          </Link>

                          <div className="mt-4 flex items-center gap-4 text-sm">
                            <Link
                              href={`/artwork/${artwork.artwork_id}/edit`}
                              className="underline underline-offset-4 hover:text-[#B87559]"
                            >
                              Edit
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteArtwork(artwork.artwork_id)
                              }
                              className="text-[#B87559] underline underline-offset-4"
                            >
                              Hapus
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* TAB 2: FAVORIT SAYA */}
            {activeTab === "favorites" && (
              <section>
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#77796B]">
                      Saved Inspiration
                    </p>
                    <h2 className="font-serif text-3xl">Karya Favorit Saya</h2>
                  </div>

                  <span className="text-sm text-[#77796B]">
                    {favorites.length} karya tersimpan
                  </span>
                </div>

                {favorites.length === 0 ? (
                  <div className="border border-dashed border-[#B8AA98] p-12 text-center">
                    <h3 className="mb-3 font-serif text-2xl">
                      Belum ada karya favorit.
                    </h3>
                    <p className="mb-6 text-sm text-[#77796B]">
                      Jelajahi galeri SONDER dan simpan karya yang menginspirasimu.
                    </p>
                    <Link
                      href="/explore"
                      className="inline-block bg-[#34312E] px-6 py-3 text-sm text-[#F3EFE7]"
                    >
                      Jelajahi Karya
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {favorites.map((artwork) => {
                      const artist =
                        artwork.source_type === "curated"
                          ? artwork.artist_name
                          : artwork.member_username || artwork.username;

                      return (
                        <article key={artwork.artwork_id} className="group">
                          <Link href={`/artwork/${artwork.artwork_id}`}>
                            <div className="mb-4 aspect-[4/5] overflow-hidden bg-[#DED4C5]">
                              <img
                                src={artwork.image_url}
                                alt={artwork.title}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            </div>

                            <p className="mb-1 text-xs uppercase tracking-widest text-[#B87559]">
                              {artwork.category_name || "Artwork"}
                            </p>

                            <h3 className="font-serif text-xl group-hover:text-[#B87559]">
                              {artwork.title}
                            </h3>

                            <p className="mt-1 text-xs text-[#77796B]">
                              oleh {artist || "Kreator SONDER"}
                            </p>
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveFavorite(artwork.artwork_id)
                            }
                            className="mt-3 text-xs text-[#B87559] underline underline-offset-4"
                          >
                            Hapus dari Favorit
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* TAB 3: SUBMISI CHALLENGE */}
            {activeTab === "submissions" && (
              <section>
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#77796B]">
                      Challenge Participation
                    </p>
                    <h2 className="font-serif text-3xl">
                      Riwayat Submisi Challenge
                    </h2>
                  </div>

                  <Link
                    href="/challenges"
                    className="text-sm underline underline-offset-4 hover:text-[#B87559]"
                  >
                    Lihat Semua Challenge →
                  </Link>
                </div>

                {submissions.length === 0 ? (
                  <div className="border border-dashed border-[#B8AA98] p-12 text-center">
                    <h3 className="mb-3 font-serif text-2xl">
                      Belum pernah mengikuti challenge.
                    </h3>
                    <p className="mb-6 text-sm text-[#77796B]">
                      Kirimkan karya terbaikmu ke challenge yang sedang berlangsung.
                    </p>
                    <Link
                      href="/challenges"
                      className="inline-block bg-[#34312E] px-6 py-3 text-sm text-[#F3EFE7]"
                    >
                      Lihat Challenge Aktif
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((sub) => (
                      <article
                        key={sub.submission_id}
                        className="flex flex-col justify-between gap-5 border border-[#DED4C5] bg-[#FCFAF6] p-6 md:flex-row md:items-center"
                      >
                        <div className="flex items-center gap-5">
                          {sub.artwork_image && (
                            <img
                              src={sub.artwork_image}
                              alt={sub.artwork_title}
                              className="h-20 w-20 object-cover bg-[#DED4C5]"
                            />
                          )}

                          <div>
                            <p className="text-xs uppercase tracking-widest text-[#B87559]">
                              {sub.winner_rank
                                ? `★ Pemenang Juara ${sub.winner_rank}`
                                : sub.status === "active"
                                ? "Submisi Aktif"
                                : "Ditarik (Withdrawn)"}
                            </p>

                            <h3 className="mt-1 font-serif text-2xl">
                              {sub.challenge_title}
                            </h3>

                            <p className="mt-1 text-sm text-[#77796B]">
                              Karya:{" "}
                              <span className="font-medium text-[#34312E]">
                                {sub.artwork_title}
                              </span>
                            </p>
                          </div>
                        </div>

                        <Link
                          href={`/challenges/${sub.challenge_id}`}
                          className="self-start border border-[#34312E] px-5 py-2.5 text-xs uppercase tracking-widest transition hover:bg-[#34312E] hover:text-[#F3EFE7] md:self-center"
                        >
                          Buka Challenge →
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TAB 4: PROFIL & AKUN */}
            {activeTab === "profile" && (
              <section className="max-w-3xl border border-[#DED4C5] bg-[#FCFAF6] p-8 md:p-10">
                <p className="text-xs uppercase tracking-[0.2em] text-[#B87559]">
                  Profile & Account Settings
                </p>

                <h2 className="mt-2 font-serif text-3xl">
                  Kelola Profil Kreator
                </h2>

                <p className="mt-2 text-sm text-[#77796B]">
                  Perbarui informasi profil publik serta pengaturan akunmu di SONDER.
                </p>

                <form
                  onSubmit={handleProfileSubmit}
                  className="mt-8 space-y-5"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Username / Nama Tampilan
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={profileForm.username}
                        onChange={handleProfileChange}
                        required
                        className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Alamat Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        required
                        className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      URL Foto Profil (opsional)
                    </label>
                    <input
                      type="url"
                      name="profile_image"
                      value={profileForm.profile_image}
                      onChange={handleProfileChange}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Bio / Deskripsi Singkat Kreator
                    </label>
                    <textarea
                      name="bio"
                      value={profileForm.bio}
                      onChange={handleProfileChange}
                      rows={4}
                      placeholder="Ceritakan sedikit tentang dirimu dan fokus karya senimu..."
                      className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Tautan Eksternal (Instagram, Behance, atau Website pribadi)
                    </label>
                    <input
                      type="url"
                      name="external_link"
                      value={profileForm.external_link}
                      onChange={handleProfileChange}
                      placeholder="https://instagram.com/username"
                      className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
                    />
                  </div>

                  <div className="border-t border-[#DED4C5] pt-5">
                    <label className="mb-2 block text-sm font-medium">
                      Ganti Password Baru (kosongkan jika tidak ingin mengubah)
                    </label>
                    <input
                      type="password"
                      name="new_password"
                      value={profileForm.new_password}
                      onChange={handleProfileChange}
                      placeholder="Minimal 8 karakter"
                      minLength={8}
                      className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
                    />
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="bg-[#34312E] px-8 py-3.5 text-xs uppercase tracking-widest text-[#F3EFE7] transition hover:bg-[#B87559] disabled:opacity-50"
                    >
                      {savingProfile ? "MENYIMPAN..." : "Simpan Profil"}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}
      </section>

      <footer className="border-t border-[#DED4C5] px-6 py-7 text-sm text-[#77796B] md:px-12">
        SONDER — Every Piece Has a Story.
      </footer>
    </main>
  );
}
