"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ImageUploader from "@/components/ImageUploader";

export default function EditArtworkPage() {
  const { id } = useParams();
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    category_id: "",
    image_url: "",
    tags: "",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const userRes = await fetch("/api/me", { cache: "no-store" });
        const userResult = await userRes.json();

        if (!userRes.ok || !userResult.success) {
          router.replace("/login");
          return;
        }

        const currentUser = userResult.data;

        if (currentUser.role !== "member") {
          router.replace("/dashboard");
          return;
        }

        const [artRes, catRes] = await Promise.all([
          fetch(`/api/artworks/${id}`, { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
        ]);

        const [artResult, catResult] = await Promise.all([
          artRes.json(),
          catRes.json(),
        ]);

        if (!artRes.ok || !artResult.success) {
          throw new Error(artResult.message || "Karya tidak ditemukan.");
        }

        const artwork = artResult.data;

        if (
          artwork.source_type !== "member" ||
          Number(artwork.user_id) !== Number(currentUser.user_id)
        ) {
          router.replace("/dashboard");
          return;
        }

        if (!active) return;

        setCategories(catResult.data || []);
        setForm({
          title: artwork.title || "",
          category_id: String(artwork.category_id || ""),
          image_url: artwork.image_url || "",
          tags: artwork.tags || "",
          description: artwork.description || "",
        });
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) loadData();

    return () => {
      active = false;
    };
  }, [id, router]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (uploadingImage) {
      setError("Mohon tunggu hingga proses unggah gambar selesai.");
      return;
    }

    if (!form.image_url) {
      setError("Gambar karya tidak boleh kosong. Silakan pilih file gambar.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/artworks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          category_id: Number(form.category_id),
          image_url: form.image_url,
          tags: form.tags,
          description: form.description,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memperbarui karya.");
      }

      router.push(`/artwork/${id}`);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFE7] text-[#77796B]">
        Memuat data karya...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <section className="mx-auto max-w-4xl px-6 py-14 md:px-12">
        <Link
          href="/dashboard"
          className="text-xs uppercase tracking-widest text-[#77796B] hover:text-[#B87559]"
        >
          ← Kembali ke Dashboard
        </Link>

        <div className="mt-8 border border-[#DED4C5] bg-[#FCFAF6] p-8 md:p-12">
          <p className="text-xs uppercase tracking-[0.25em] text-[#B87559]">
            EDIT ARTWORK
          </p>

          <h1 className="mt-3 font-serif text-4xl">
            Perbarui Informasi Karya.
          </h1>

          <p className="mt-3 text-sm text-[#77796B]">
            Perbarui judul, kategori, tags, cerita karya, atau ganti gambar karya jika diperlukan.
          </p>

          {error && (
            <p className="mt-6 border-l-2 border-[#B87559] bg-[#B87559]/10 px-4 py-3 text-sm text-[#8B4935]">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Judul Karya
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={150}
                required
                className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Kategori Karya
                </label>
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                  className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
                >
                  <option value="">Pilih kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Tags (pisahkan dengan koma, min. 1 tag)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  required
                  className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
                />
              </div>
            </div>

            <ImageUploader
              uploadType="artwork"
              label="Gambar Karya"
              value={form.image_url}
              onChange={(url) =>
                setForm((prev) => ({ ...prev, image_url: url }))
              }
              onUploadingChange={setUploadingImage}
              required
            />

            <div>
              <label className="mb-2 block text-sm font-medium">
                Cerita & Deskripsi Karya
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                required
                className="w-full border border-[#DED4C5] bg-[#F3EFE7] px-4 py-3 text-sm outline-none focus:border-[#B87559]"
              />
            </div>

            <div className="flex flex-wrap gap-4 pt-3">
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="bg-[#34312E] px-8 py-3.5 text-xs uppercase tracking-widest text-[#F3EFE7] transition hover:bg-[#B87559] disabled:opacity-50"
              >
                {uploadingImage
                  ? "MENGUNGGAH GAMBAR..."
                  : saving
                  ? "MENYIMPAN..."
                  : "Simpan Perubahan"}
              </button>

              <Link
                href="/dashboard"
                className="border border-[#34312E] px-8 py-3.5 text-xs uppercase tracking-widest text-[#34312E] transition hover:bg-[#34312E] hover:text-[#F3EFE7]"
              >
                Batal
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
