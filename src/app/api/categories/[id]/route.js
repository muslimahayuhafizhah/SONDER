import db from "@/lib/db";
import {
  requireRole,
  isSameOriginRequest,
} from "@/lib/get-user";

export async function PATCH(request, { params }) {
  const { error } = await requireRole(["admin"]);

  if (error) return error;

  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, message: "Permintaan tidak valid." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const { category_name, description } = await request.json();

    if (!category_name || !category_name.trim()) {
      return Response.json(
        { success: false, message: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE categories
       SET category_name = $1,
           description = $2
       WHERE category_id = $3
       RETURNING *`,
      [category_name.trim(), description?.trim() || null, id]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, message: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Kategori berhasil diperbarui.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    if (error.code === "23505") {
      return Response.json(
        { success: false, message: "Nama kategori sudah digunakan." },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Gagal memperbarui kategori." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { error } = await requireRole(["admin"]);

  if (error) return error;

  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, message: "Permintaan tidak valid." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    const result = await db.query(
      `DELETE FROM categories
       WHERE category_id = $1
       RETURNING category_id`,
      [id]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, message: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Kategori berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);

    if (error.code === "23503") {
      return Response.json(
        {
          success: false,
          message: "Kategori tidak dapat dihapus karena masih digunakan oleh karya.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Gagal menghapus kategori." },
      { status: 500 }
    );
  }
}