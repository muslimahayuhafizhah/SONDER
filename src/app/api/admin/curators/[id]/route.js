
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
    const curatorId = Number(id);

    if (!Number.isInteger(curatorId) || curatorId <= 0) {
      return Response.json(
        { success: false, message: "ID Curator tidak valid." },
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

    const { status } = body;

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
         AND curator_status = 'pending'
       RETURNING user_id, username, curator_status`,
      [status, curatorId]
    );

    if (result.rowCount === 0) {
      return Response.json(
        {
          success: false,
          message: "Pendaftaran Curator tidak ditemukan atau sudah diproses.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message:
        status === "approved"
          ? "Curator berhasil disetujui."
          : "Pendaftaran Curator ditolak.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("PATCH ADMIN CURATOR ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Gagal memperbarui status Curator.",
      },
      { status: 500 }
    );
  }
}
