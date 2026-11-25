import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getCurrentUser, isSameOriginRequest } from "@/lib/get-user";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

function detectImageTypeFromBuffer(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG magic bytes: FF D8 FF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }

  // WebP magic bytes: "RIFF" at 0..3 and "WEBP" at 8..11
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}

export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { success: false, message: "Permintaan tidak valid." },
        { status: 403 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu sebelum mengunggah gambar." },
        { status: 401 }
      );
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, message: "Format form upload tidak valid." },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    const uploadType = String(formData.get("type") || "artwork").toLowerCase();

    // Validasi hak akses berdasarkan jenis upload
    if (uploadType === "artwork") {
      if (user.role !== "member") {
        return NextResponse.json(
          {
            success: false,
            message: "Hanya akun Member yang memiliki hak untuk mengunggah gambar karya.",
          },
          { status: 403 }
        );
      }
    } else if (uploadType === "banner") {
      if (user.role !== "curator" || user.curator_status !== "approved") {
        return NextResponse.json(
          {
            success: false,
            message: "Hanya akun Curator yang sudah disetujui Admin yang dapat mengunggah banner challenge.",
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Tipe tujuan upload tidak dikenali." },
        { status: 400 }
      );
    }

    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { success: false, message: "Pilih file gambar terlebih dahulu." },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { success: false, message: "File gambar kosong atau rusak." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Ukuran file terlalu besar. Maksimal ukuran gambar adalah 5 MB.",
        },
        { status: 400 }
      );
    }

    const originalName = String(file.name || "");
    const ext = path.extname(originalName).toLowerCase();
    const declaredMime = String(file.type || "").toLowerCase();

    if (
      !ALLOWED_MIME_TYPES[declaredMime] ||
      !ALLOWED_MIME_TYPES[declaredMime].includes(ext)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Format file tidak didukung. Gunakan file gambar JPG, JPEG, PNG, atau WebP.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validasi signature biner asli (magic bytes) agar pengguna tidak bisa memalsukan ekstensi file
    const detected = detectImageTypeFromBuffer(buffer);

    if (!detected || detected.mime !== declaredMime) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Isi file tidak valid atau bukan gambar asli. Pastikan file benar-benar berformat JPG, PNG, atau WebP.",
        },
        { status: 400 }
      );
    }

    const subFolder = uploadType === "banner" ? "banners" : "artworks";
    const baseUploadDir = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR, subFolder)
      : path.join(process.cwd(), "public", "uploads", subFolder);

    await mkdir(baseUploadDir, { recursive: true });

    // Buat nama file unik tanpa menggunakan input nama file dari pengguna
    const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}.${detected.ext}`;
    const fullFilePath = path.join(baseUploadDir, uniqueFilename);

    await writeFile(fullFilePath, buffer);

    const publicUrl = `/uploads/${subFolder}/${uniqueFilename}`;

    return NextResponse.json(
      {
        success: true,
        message: "Gambar berhasil diunggah.",
        data: {
          url: publicUrl,
          filename: uniqueFilename,
          size: file.size,
          mime_type: detected.mime,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("UPLOAD IMAGE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server saat menyimpan file gambar.",
      },
      { status: 500 }
    );
  }
}
