
import db from "@/lib/db";
import {
  requireRole,
  isSameOriginRequest,
} from "@/lib/get-user";

export async function DELETE(request, { params }) {
  const { user, error } = await requireRole(["admin"]);

  if (error) return error;

  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, message: "Permintaan tidak valid." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json(
        { success: false, message: "ID pengguna tidak valid." },
        { status: 400 }
      );
    }

    if (userId === Number(user.user_id)) {
      return Response.json(
        {
          success: false,
          message: "Admin tidak dapat menghapus akunnya sendiri melalui fitur ini.",
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      `DELETE FROM users
       WHERE user_id = $1
         AND role IN ('member', 'curator')
       RETURNING user_id`,
      [userId]
    );

    if (result.rowCount === 0) {
      return Response.json(
        {
          success: false,
          message: "Pengguna tidak ditemukan atau tidak dapat dihapus.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Akun pengguna berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE ADMIN USER ERROR:", error);

    if (error.code === "23503") {
      return Response.json(
        {
          success: false,
          message: "Akun tidak dapat dihapus karena masih memiliki data yang terkait.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Gagal menghapus akun pengguna." },
      { status: 500 }
    );
  }
}
