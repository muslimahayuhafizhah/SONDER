import db from "@/lib/db";
import {
  requireRole,
  isSameOriginRequest,
} from "@/lib/get-user";

export async function GET() {
  try {
    const result = await db.query(
      `SELECT *
       FROM categories
       ORDER BY category_id`
    );

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Gagal mengambil data kategori." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const { error } = await requireRole(["admin"]);

  if (error) return error;

  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, message: "Permintaan tidak valid." },
      { status: 403 }
    );
  }

  try {
    const { category_name, description } = await request.json();

    if (!category_name || !category_name.trim()) {
      return Response.json(
        { success: false, message: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO categories (category_name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [category_name.trim(), description?.trim() || null]
    );

    return Response.json(
      {
        success: true,
        message: "Kategori berhasil ditambahkan.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    if (error.code === "23505") {
      return Response.json(
        { success: false, message: "Nama kategori sudah digunakan." },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Gagal menambahkan kategori." },
      { status: 500 }
    );
  }
}