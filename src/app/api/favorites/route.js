
import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

export async function GET(request) {
  try {
    const { user, error } = await requireRole(["member"]);
    if (error) return error;

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
        `SELECT EXISTS (
           SELECT 1
           FROM favorites f
           JOIN artworks a ON a.artwork_id = f.artwork_id
           WHERE f.user_id = $1
             AND f.artwork_id = $2
             AND a.status = 'published'
         ) AS is_favorite`,
        [user.user_id, id]
      );

      return Response.json({
        success: true,
        is_favorite: result.rows[0].is_favorite,
      });
    }

    const result = await db.query(
      `SELECT
         a.artwork_id,
         a.title,
         a.image_url,
         a.artist_name,
         a.source_type,
         f.created_at AS favorited_at
       FROM favorites f
       JOIN artworks a ON a.artwork_id = f.artwork_id
       WHERE f.user_id = $1
         AND a.status = 'published'
       ORDER BY f.created_at DESC`,
      [user.user_id]
    );

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Gagal mengambil favorites:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil data favorites." },
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
      `INSERT INTO favorites (user_id, artwork_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, artwork_id) DO NOTHING`,
      [user.user_id, id]
    );

    return Response.json({
      success: true,
      message: "Karya berhasil disimpan ke favorites.",
    });
  } catch (error) {
    console.error("Gagal menyimpan favorite:", error);

    return Response.json(
      { success: false, message: "Gagal menyimpan favorite." },
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
      `DELETE FROM favorites
       WHERE user_id = $1 AND artwork_id = $2`,
      [user.user_id, id]
    );

    return Response.json({
      success: true,
      message: "Karya dihapus dari favorites.",
    });
  } catch (error) {
    console.error("Gagal menghapus favorite:", error);

    return Response.json(
      { success: false, message: "Gagal menghapus favorite." },
      { status: 500 }
    );
  }
}
