"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("overview");

  const [stats, setStats] = useState({});
  const [curators, setCurators] = useState([]);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [categoryForm, setCategoryForm] = useState({
    category_name: "",
    description: "",
  });

  const [editingCategory, setEditingCategory] = useState(null);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "curators", label: "Curator" },
    { id: "reports", label: "Laporan" },
    { id: "users", label: "Pengguna" },
    { id: "categories", label: "Kategori" },
  ];

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const endpoints = [
        "/api/admin/stats",
        "/api/admin/curators",
        "/api/admin/reports",
        "/api/admin/users",
        "/api/categories",
      ];

      const responses = await Promise.all(
        endpoints.map((url) => fetch(url, { cache: "no-store" }))
      );

      const results = await Promise.all(
        responses.map((response) => response.json())
      );

      if (results.some((result) => !result.success)) {
        throw new Error("Sebagian data dashboard gagal dimuat.");
      }

      setStats(results[0].data || {});
      setCurators(results[1].data || []);
      setReports(results[2].data || []);
      setUsers(results[3].data || []);
      setCategories(results[4].data || []);

      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function sendAction(url, method, body = null) {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(url, {
        method,
        headers: body
          ? { "Content-Type": "application/json" }
          : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Tindakan gagal dilakukan.");
      }

      const successMessage = result.message || "Berhasil diperbarui.";

      const refreshed = await loadDashboard(false);

      if (refreshed) {
        setMessage(successMessage);
      }

      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleCurator(id, status) {
    const label = status === "approved" ? "menyetujui" : "menolak";

    if (!window.confirm(`Yakin ingin ${label} pendaftaran Curator ini?`)) {
      return;
    }

    await sendAction(`/api/admin/curators/${id}`, "PATCH", {
      status,
    });
  }

  async function handleReport(id, status) {
    const label = status === "dismissed" ? "mengabaikan" : "menurunkan";

    if (!window.confirm(`Yakin ingin ${label} laporan ini?`)) {
      return;
    }

    await sendAction(`/api/admin/reports/${id}`, "PATCH", {
      status,
    });
  }

  async function handleDeleteUser(id) {
    if (!window.confirm("Yakin ingin menghapus akun pengguna ini?")) {
      return;
    }

    await sendAction(`/api/admin/users/${id}`, "DELETE");
  }

  function handleCategoryChange(event) {
    const { name, value } = event.target;

    setCategoryForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function startEditCategory(category) {
    setEditingCategory(category.category_id);

    setCategoryForm({
      category_name: category.category_name,
      description: category.description || "",
    });
  }

  function cancelEditCategory() {
    setEditingCategory(null);

    setCategoryForm({
      category_name: "",
      description: "",
    });
  }

  async function handleCategorySubmit(event) {
    event.preventDefault();

    const isEditing = editingCategory !== null;

    const success = await sendAction(
      isEditing
        ? `/api/categories/${editingCategory}`
        : "/api/categories",
      isEditing ? "PATCH" : "POST",
      categoryForm
    );

    if (success) {
      cancelEditCategory();
    }
  }

  async function handleDeleteCategory(id) {
    if (!window.confirm("Yakin ingin menghapus kategori ini?")) {
      return;
    }

    await sendAction(`/api/categories/${id}`, "DELETE");
  }

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const statLabels = {
    total_members: "Total Member",
    total_curators: "Total Curator (Approved)",
    pending_curators: "Curator Menunggu",
    total_artworks: "Total Karya",
    total_categories: "Total Kategori",
    total_challenges: "Total Challenge",
    active_challenges: "Challenge Aktif",
    pending_reports: "Laporan Menunggu",
    total_comments: "Total Komentar",
    total_likes: "Total Likes",
  };

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-14">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.25em] text-[#B87559] mb-3">
            Administration
          </p>

          <h1 className="font-serif text-4xl md:text-5xl mb-3">
            Welcome, {user?.username}.
          </h1>

          <p className="text-[#77796B]">
            Kelola aktivitas dan komunitas SONDER dari satu tempat.
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto border-b border-[#DED4C5] mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-3 text-sm border-b-2 transition ${
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
          <div className="bg-[#DED4C5] px-5 py-4 mb-6 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-[#77796B]">
            Memuat data dashboard...
          </p>
        ) : (
          <>
            {activeTab === "overview" && (
              <section>
                <p className="text-xs uppercase tracking-[0.2em] text-[#77796B] mb-6">
                  Platform Overview
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(stats).map(([key, value]) => (
                    <div key={key} className="bg-[#DED4C5] p-7">
                      <p className="text-sm text-[#77796B] mb-3">
                        {statLabels[key] || key}
                      </p>

                      <p className="font-serif text-4xl">
                        {value ?? 0}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <button
                    onClick={() => setActiveTab("curators")}
                    className="text-left border border-[#B8AA98] p-6 hover:bg-[#DED4C5] transition"
                  >
                    <p className="font-serif text-2xl mb-2">
                      Persetujuan Curator
                    </p>
                    <p className="text-sm text-[#77796B]">
                      {stats.pending_curators || 0} pendaftaran menunggu.
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab("reports")}
                    className="text-left border border-[#B8AA98] p-6 hover:bg-[#DED4C5] transition"
                  >
                    <p className="font-serif text-2xl mb-2">
                      Moderasi Laporan
                    </p>
                    <p className="text-sm text-[#77796B]">
                      {stats.pending_reports || 0} laporan menunggu.
                    </p>
                  </button>
                </div>
              </section>
            )}

            {activeTab === "curators" && (
              <section>
                <h2 className="font-serif text-3xl mb-6">
                  Pendaftaran Curator
                </h2>

                {curators.length === 0 ? (
                  <p className="text-[#77796B]">
                    Tidak ada pendaftaran Curator.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {curators.map((curator) => (
                      <article
                        key={curator.user_id}
                        className="border border-[#DED4C5] p-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
                      >
                        <div>
                          <h3 className="font-serif text-xl">
                            {curator.username}
                          </h3>

                          <p className="text-sm text-[#77796B]">
                            {curator.email}
                          </p>

                          <p className="text-xs text-[#B87559] mt-2">
                            Status: {curator.curator_status}
                          </p>
                        </div>

                        {curator.curator_status === "pending" && (
                          <div className="flex gap-3">
                            <button
                              disabled={saving}
                              onClick={() =>
                                handleCurator(curator.user_id, "approved")
                              }
                              className="bg-[#34312E] text-[#F3EFE7] px-5 py-3 text-sm disabled:opacity-50"
                            >
                              Approve
                            </button>

                            <button
                              disabled={saving}
                              onClick={() =>
                                handleCurator(curator.user_id, "rejected")
                              }
                              className="border border-[#B87559] text-[#B87559] px-5 py-3 text-sm disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "reports" && (
              <section>
                <h2 className="font-serif text-3xl mb-6">
                  Moderasi Laporan (Moderation Queue)
                </h2>

                {reports.length === 0 ? (
                  <p className="text-[#77796B]">
                    Tidak ada laporan yang perlu ditampilkan.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <article
                        key={report.report_id}
                        className="border border-[#DED4C5] p-6"
                      >
                        <div className="flex flex-col md:flex-row justify-between gap-5">
                          <div>
                            <h3 className="font-serif text-xl mb-2">
                              {report.artwork_title ||
                                `Artwork #${report.artwork_id}`}
                            </h3>

                            {report.image_url && (
                              <img
                                src={report.image_url}
                                alt={report.artwork_title || "Karya"}
                                className="w-32 h-32 object-cover mb-3"
                              />
                            )}

                            <p className="text-sm text-[#77796B]">
                              Pelapor: {report.reporter_username || report.reporter_id}
                            </p>

                            <p className="text-sm mt-2">
                              Alasan: {report.reason}
                            </p>

                            <p className="text-xs text-[#77796B] mt-1">
                              Total Laporan pada Karya Ini: {report.report_count || 1} laporan
                            </p>

                            <p className="text-xs text-[#B87559] mt-2">
                              Status: {report.status}
                            </p>
                          </div>

                          {report.status === "pending" && (
                            <div className="flex gap-3 items-start">
                              <button
                                disabled={saving}
                                onClick={() =>
                                  handleReport(report.report_id, "dismissed")
                                }
                                className="border border-[#B8AA98] px-4 py-3 text-sm disabled:opacity-50"
                              >
                                Dismiss Report
                              </button>

                              <button
                                disabled={saving}
                                onClick={() =>
                                  handleReport(report.report_id, "taken_down")
                                }
                                className="bg-[#B87559] text-white px-4 py-3 text-sm disabled:opacity-50"
                              >
                                Take Down
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "users" && (
              <section>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-serif text-3xl">
                    Pengelolaan Pengguna
                  </h2>

                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-[#77796B]">
                      Filter Peran:
                    </span>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="border border-[#DED4C5] bg-[#FCFAF6] px-4 py-2 text-sm outline-none"
                    >
                      <option value="all">Semua Peran ({users.length})</option>
                      <option value="member">Member</option>
                      <option value="curator">Curator</option>
                    </select>
                  </div>
                </div>

                {filteredUsers.length === 0 ? (
                  <p className="text-[#77796B]">
                    Tidak ada pengguna pada filter ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((item) => (
                      <article
                        key={item.user_id}
                        className="border border-[#DED4C5] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <h3 className="font-serif text-xl">
                            {item.username}
                          </h3>

                          <p className="text-sm text-[#77796B]">
                            {item.email}
                          </p>

                          <p className="text-xs text-[#B87559] mt-2 capitalize">
                            {item.role}
                            {item.curator_status
                              ? ` — ${item.curator_status}`
                              : ""}
                          </p>
                        </div>

                        <button
                          disabled={saving}
                          onClick={() => handleDeleteUser(item.user_id)}
                          className="text-sm text-[#B87559] underline underline-offset-4 self-start disabled:opacity-50"
                        >
                          Hapus Akun
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "categories" && (
              <section>
                <h2 className="font-serif text-3xl mb-6">
                  Pengelolaan Kategori
                </h2>

                <form
                  onSubmit={handleCategorySubmit}
                  className="bg-[#DED4C5] p-6 mb-8 space-y-4"
                >
                  <h3 className="font-serif text-xl">
                    {editingCategory !== null
                      ? "Edit Kategori"
                      : "Tambah Kategori"}
                  </h3>

                  <input
                    name="category_name"
                    value={categoryForm.category_name}
                    onChange={handleCategoryChange}
                    required
                    placeholder="Nama kategori"
                    className="w-full bg-[#F3EFE7] p-3 outline-none"
                  />

                  <textarea
                    name="description"
                    value={categoryForm.description}
                    onChange={handleCategoryChange}
                    placeholder="Deskripsi kategori"
                    rows={3}
                    className="w-full bg-[#F3EFE7] p-3 outline-none"
                  />

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-[#34312E] text-[#F3EFE7] px-6 py-3 text-sm disabled:opacity-50"
                    >
                      {editingCategory !== null
                        ? "Simpan Perubahan"
                        : "Tambah Kategori"}
                    </button>

                    {editingCategory !== null && (
                      <button
                        type="button"
                        onClick={cancelEditCategory}
                        className="border border-[#34312E] px-6 py-3 text-sm"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>

                <div className="space-y-3">
                  {categories.map((category) => (
                    <article
                      key={category.category_id}
                      className="border border-[#DED4C5] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-serif text-xl">
                          {category.category_name}
                        </h3>

                        <p className="text-sm text-[#77796B] mt-1">
                          {category.description || "Tidak ada deskripsi."}
                        </p>
                      </div>

                      <div className="flex gap-4 text-sm">
                        <button
                          onClick={() => startEditCategory(category)}
                          className="underline underline-offset-4"
                        >
                          Edit
                        </button>

                        <button
                          disabled={saving}
                          onClick={() =>
                            handleDeleteCategory(category.category_id)
                          }
                          className="text-[#B87559] underline underline-offset-4 disabled:opacity-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </article>
                  ))}

                  {categories.length === 0 && (
                    <p className="text-[#77796B]">
                      Belum ada kategori.
                    </p>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </section>

      <footer className="border-t border-[#DED4C5] px-6 md:px-12 py-7 text-sm text-[#77796B]">
        SONDER — Every Piece Has a Story.
      </footer>
    </main>
  );
}
