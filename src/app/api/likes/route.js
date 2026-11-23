
import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const artworkId = searchParams.get("artwork_id");

    if (artworkId) {
      const id = Number(artworkId);

      if (!Number.isInteger(id) || id <= 0) {
        return Response.json(
          { success: false, message: "ID karya tidak valid." },
          { status: 400 }
        );
      }

      const result = await db.query(
        `SELECT COUNT(*) AS total
         FROM likes
         WHERE artwork_id = $1`,
        [id]
      );

      return Response.json({
        success: true,
        count: Number(result.rows[0].total),
      });
    }

    const result = await db.query(
      `SELECT artwork_id, COUNT(*) AS total
       FROM likes
       GROUP BY artwork_id`
    );

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Gagal mengambil likes:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil data likes." },
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

    const { artwork_id } = await request.json();
    const id = Number(artwork_id);

    if (!Number.isInteger(id) || id <= 0) {
      return Response.json(
        { success: false, message: "ID karya tidak valid." },
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

    await db.query(
      `INSERT INTO likes (user_id, artwork_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, artwork_id) DO NOTHING`,
      [user.user_id, id]
    );

    return Response.json({
      success: true,
      message: "Karya berhasil disukai.",
    });
  } catch (error) {
    console.error("Gagal memberi like:", error);

    return Response.json(
      { success: false, message: "Gagal memberi like." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

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

    await db.query(
      `DELETE FROM likes
       WHERE user_id = $1 AND artwork_id = $2`,
      [user.user_id, id]
    );

    return Response.json({
      success: true,
      message: "Like berhasil dihapus.",
    });
  } catch (error) {
    console.error("Gagal menghapus like:", error);

    return Response.json(
      { success: false, message: "Gagal menghapus like." },
      { status: 500 }
    );
  }
}
