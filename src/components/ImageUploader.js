"use client";

import { useRef, useState } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageUploader({
  uploadType = "artwork",
  value = "",
  onChange,
  onUploadingChange,
  label = "Unggah Gambar",
  helperText = "Format yang didukung: JPG, JPEG, PNG, WebP (Maksimal 5 MB).",
  required = false,
}) {
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [initialValue] = useState(value || "");

  function updateUploading(state) {
    setUploading(state);
    if (typeof onUploadingChange === "function") {
      onUploadingChange(state);
    }
  }

  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");

    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) =>
      fileNameLower.endsWith(ext)
    );

    if (!ALLOWED_TYPES.includes(file.type) || !hasValidExt) {
      setUploadError(
        "Format file tidak valid. Pilih gambar dengan format JPG, JPEG, PNG, atau WebP."
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(
        `Ukuran file (${formatFileSize(file.size)}) melebihi batas maksimal 5 MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    updateUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", uploadType);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data?.url) {
        throw new Error(
          result.message || "Gagal mengunggah gambar ke server."
        );
      }

      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type,
        url: result.data.url,
      });

      if (typeof onChange === "function") {
        onChange(result.data.url);
      }
    } catch (err) {
      setUploadError(err.message || "Gagal mengunggah gambar.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      updateUploading(false);
    }
  }

  function handleRemoveSelected() {
    setUploadError("");
    setFileInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (typeof onChange === "function") {
      onChange(initialValue || "");
    }
  }

  function handleClearAll() {
    setUploadError("");
    setFileInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (typeof onChange === "function") {
      onChange("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[#34312E]">
          {label} {required && <span className="text-[#B87559]">*</span>}
        </label>
        <span className="text-xs text-[#77796B]">{helperText}</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="border border-dashed border-[#B9AD9D] bg-[#F3EFE7] p-6">
        {value ? (
          <div className="space-y-4">
            <div className="overflow-hidden border border-[#DED4C5] bg-[#DED4C5]">
              <img
                src={value}
                alt="Preview gambar"
                className="max-h-72 w-full object-contain"
              />
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-[#DED4C5] pt-4 sm:flex-row sm:items-center">
              <div className="text-xs text-[#77796B]">
                {fileInfo ? (
                  <>
                    <p className="font-medium text-[#34312E]">
                      File terpilih: {fileInfo.name}
                    </p>
                    <p className="mt-0.5">
                      Ukuran: {formatFileSize(fileInfo.size)} · Tersimpan siap dipublikasikan
                    </p>
                  </>
                ) : (
                  <p className="font-medium text-[#34312E]">
                    Gambar saat ini aktif dan tersimpan.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-[#34312E] bg-[#FCFAF6] px-4 py-2 text-xs uppercase tracking-widest text-[#34312E] transition hover:bg-[#34312E] hover:text-[#F3EFE7] disabled:opacity-50"
                >
                  {uploading ? "Mengunggah..." : "Ganti Gambar"}
                </button>

                {fileInfo && initialValue && initialValue !== value ? (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleRemoveSelected}
                    className="border border-[#B87559] px-4 py-2 text-xs uppercase tracking-widest text-[#B87559] transition hover:bg-[#B87559] hover:text-[#F3EFE7] disabled:opacity-50"
                  >
                    Kembalikan Gambar Semula
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleClearAll}
                    className="border border-[#B87559] px-4 py-2 text-xs uppercase tracking-widest text-[#B87559] transition hover:bg-[#B87559] hover:text-[#F3EFE7] disabled:opacity-50"
                  >
                    Hapus Gambar
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="font-serif text-xl text-[#34312E]">
              {uploading
                ? "Sedang mengunggah gambar ke server..."
                : "Pilih gambar dari perangkatmu"}
            </p>

            <p className="mt-2 max-w-md text-xs leading-5 text-[#77796B]">
              Mendukung file JPG, JPEG, PNG, dan WebP dengan ukuran maksimal 5 MB.
            </p>

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 bg-[#34312E] px-6 py-3 text-xs uppercase tracking-widest text-[#F3EFE7] transition hover:bg-[#B87559] disabled:opacity-50"
            >
              {uploading ? "MENGUNGGAH..." : "Pilih File Gambar"}
            </button>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="border-l-2 border-[#B87559] bg-[#B87559]/10 px-4 py-3 text-xs text-[#8B4935]">
          {uploadError}
        </p>
      )}
    </div>
  );
}
