
import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

export async function GET(request) {
  try {
    const { error } = await requireRole(["member", "curator"]);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const artworkId = Number(searchParams.get("artwork_id"));

    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return Response.json(
        { success: false, message: "ID karya tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `SELECT
         c.comment_id,
         c.comment_text,
         c.created_at,
         u.user_id,
         u.username,
         u.profile_image
       FROM comments c
       JOIN users u ON u.user_id = c.user_id
       JOIN artworks a ON a.artwork_id = c.artwork_id
       WHERE c.artwork_id = $1
         AND a.status = 'published'
       ORDER BY c.created_at ASC`,
      [artworkId]
    );

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Gagal mengambil komentar:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil komentar." },
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

    const { artwork_id, comment_text } = await request.json();
    const id = Number(artwork_id);
    const comment = comment_text?.trim();

    if (!Number.isInteger(id) || id <= 0) {
      return Response.json(
        { success: false, message: "ID karya tidak valid." },
        { status: 400 }
      );
    }

    if (!comment || comment.length > 1000) {
      return Response.json(
        {
          success: false,
          message: "Komentar wajib diisi dan maksimal 1000 karakter.",
        },
        { status: 400 }
      );
    }

    const artwork = await db.query(
      `SELECT artwork_id FROM artworks
       WHERE artwork_id = $1 AND status = 'published'`,
      [id]
    );

    if (artwork.rowCount === 0) {
      return Response.json(
        { success: false, message: "Karya tidak ditemukan." },
        { status: 404 }
      );
    }

    const result = await db.query(
      `INSERT INTO comments (artwork_id, user_id, comment_text)
       VALUES ($1, $2, $3)
       RETURNING comment_id, artwork_id, user_id, comment_text, created_at`,
      [id, user.user_id, comment]
    );

    return Response.json(
      {
        success: true,
        message: "Komentar berhasil ditambahkan.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Gagal menambahkan komentar:", error);

    return Response.json(
      { success: false, message: "Gagal menambahkan komentar." },
      { status: 500 }
    );
  }
}
