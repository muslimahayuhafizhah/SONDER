
import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

export async function DELETE(request, { params }) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

    const { user, error } = await requireRole(["member"]);
    if (error) return error;

    const { id } = await params;
    const commentId = Number(id);

    if (!Number.isInteger(commentId) || commentId <= 0) {
      return Response.json(
        { success: false, message: "ID komentar tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `DELETE FROM comments
       WHERE comment_id = $1
         AND user_id = $2
       RETURNING comment_id`,
      [commentId, user.user_id]
    );

    if (result.rowCount === 0) {
      return Response.json(
        {
          success: false,
          message: "Komentar tidak ditemukan atau bukan milikmu.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Komentar berhasil dihapus.",
    });
  } catch (error) {
    console.error("Gagal menghapus komentar:", error);

    return Response.json(
      { success: false, message: "Gagal menghapus komentar." },
      { status: 500 }
    );
  }
}
