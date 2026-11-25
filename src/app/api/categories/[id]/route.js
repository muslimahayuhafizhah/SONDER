
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
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return Response.json(
        { success: false, message: "ID kategori tidak valid." },
        { status: 400 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, message: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const { category_name, description } = body;

    if (
      typeof category_name !== "string" ||
      !category_name.trim()
    ) {
      return Response.json(
        { success: false, message: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return Response.json(
        { success: false, message: "Deskripsi kategori tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE categories
       SET category_name = $1,
           description = $2
       WHERE category_id = $3
       RETURNING *`,
      [
        category_name.trim(),
        description?.trim() || null,
        categoryId,
      ]
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
    console.error("PATCH CATEGORY ERROR:", error);

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
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return Response.json(
        { success: false, message: "ID kategori tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `DELETE FROM categories
       WHERE category_id = $1
       RETURNING category_id`,
      [categoryId]
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
    console.error("DELETE CATEGORY ERROR:", error);

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
