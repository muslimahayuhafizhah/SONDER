import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

export async function GET(request) {
  try {
    const { user, error } = await requireRole(["member"]);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("artwork_id"));

    if (!Number.isInteger(id) || id <= 0) {
      return Response.json(
        { success: false, message: "ID karya tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `SELECT EXISTS (
         SELECT 1
         FROM reports
         WHERE artwork_id = $1 AND reporter_id = $2
       ) AS has_reported`,
      [id, user.user_id]
    );

    return Response.json({
      success: true,
      data: {
        has_reported: Boolean(result.rows[0].has_reported),
      },
    });
  } catch (error) {
    console.error("GET REPORT STATUS ERROR:", error);

    return Response.json(
      { success: false, message: "Gagal memeriksa status laporan." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

    const { user, error } = await requireRole(["member"]);
    if (error) return error;

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, message: "Format data tidak valid." },
        { status: 400 }
      );
    }

    const artworkId = Number(body.artwork_id);
    const reason = body.reason?.trim();

    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return Response.json(
        { success: false, message: "ID karya tidak valid." },
        { status: 400 }
      );
    }

    if (!reason || reason.length > 100) {
      return Response.json(
        {
          success: false,
          message: "Alasan laporan wajib diisi (maksimal 100 karakter).",
        },
        { status: 400 }
      );
    }

    const artwork = await db.query(
      `SELECT artwork_id, user_id
       FROM artworks
       WHERE artwork_id = $1 AND status = 'published'`,
      [artworkId]
    );

    if (artwork.rowCount === 0) {
      return Response.json(
        { success: false, message: "Karya tidak ditemukan." },
        { status: 404 }
      );
    }

    if (Number(artwork.rows[0].user_id) === Number(user.user_id)) {
      return Response.json(
        {
          success: false,
          message: "Kamu tidak dapat melaporkan karyamu sendiri.",
        },
        { status: 400 }
      );
    }

    const existing = await db.query(
      `SELECT report_id
       FROM reports
       WHERE artwork_id = $1 AND reporter_id = $2`,
      [artworkId, user.user_id]
    );

    if (existing.rowCount > 0) {
      return Response.json(
        {
          success: false,
          message: "Kamu sudah pernah melaporkan karya ini.",
        },
        { status: 409 }
      );
    }

    const result = await db.query(
      `INSERT INTO reports (artwork_id, reporter_id, reason, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [artworkId, user.user_id, reason]
    );

    return Response.json(
      {
        success: true,
        message: "Laporan berhasil dikirim ke antrean moderasi Admin.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST REPORT ERROR:", error);

    if (error.code === "23505") {
      return Response.json(
        {
          success: false,
          message: "Kamu sudah pernah melaporkan karya ini.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Gagal mengirim laporan karya." },
      { status: 500 }
    );
  }
}
