"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageUploader from "@/components/ImageUploader";

export default function CreateArtworkPage() {
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

    async function initPage() {
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

        const catRes = await fetch("/api/categories", { cache: "no-store" });
        const catResult = await catRes.json();

        if (active && catRes.ok && catResult.success) {
          const list = catResult.data || [];
          setCategories(list);
          if (list.length > 0) {
            setForm((prev) => ({
              ...prev,
              category_id: String(list[0].category_id),
            }));
          }
        }
      } catch {
        if (active) setError("Gagal memuat halaman unggah karya.");
      } finally {
        if (active) setLoading(false);
      }
    }

    initPage();

    return () => {
      active = false;
    };
  }, [router]);

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
      setError("Silakan pilih dan unggah gambar karya dari perangkatmu terlebih dahulu.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/artworks", {
        method: "POST",
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
        throw new Error(result.message || "Gagal mengunggah karya.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3EFE7] text-[#77796B]">
        Menyiapkan ruang karya...
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
            PUBLISH AN ARTWORK
          </p>

          <h1 className="mt-3 font-serif text-4xl">
            Bagikan Karyamu ke SONDER.
          </h1>

          <p className="mt-3 text-sm text-[#77796B]">
            Setiap karya memiliki cerita. Unggah file gambar dari perangkatmu dan lengkapi detail karya di bawah ini.
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
                placeholder="Contoh: The Quiet Between"
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
                  placeholder="ilustrasi, editorial, minimalis"
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
                placeholder="Ceritakan makna, proses kreatif, atau inspirasi di balik karya ini..."
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
                  ? "MENYIMPAN KARYA..."
                  : "Publikasikan Karya"}
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
