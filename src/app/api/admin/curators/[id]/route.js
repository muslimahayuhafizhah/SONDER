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
    const { status } = await request.json();

    if (!["approved", "rejected"].includes(status)) {
      return Response.json(
        { success: false, message: "Status Curator tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE users
       SET curator_status = $1
       WHERE user_id = $2
         AND role = 'curator'
       RETURNING user_id, username, curator_status`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, message: "Curator tidak ditemukan." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: status === "approved"
        ? "Curator berhasil disetujui."
        : "Pendaftaran Curator ditolak.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Gagal memperbarui status Curator." },
      { status: 500 }
    );
  }
}