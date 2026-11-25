import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

export async function GET(request) {
  try {
    const { user, error } = await requireRole(["member", "curator"]);
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

      const [countRes, likedRes] = await Promise.all([
        db.query(
          `SELECT COUNT(*)::int AS total
           FROM likes
           WHERE artwork_id = $1`,
          [id]
        ),
        db.query(
          `SELECT EXISTS (
             SELECT 1
             FROM likes
             WHERE user_id = $1 AND artwork_id = $2
           ) AS is_liked`,
          [user.user_id, id]
        ),
      ]);

      return Response.json({
        success: true,
        data: {
          total_likes: Number(countRes.rows[0].total),
          is_liked: Boolean(likedRes.rows[0].is_liked),
        },
      });
    }

    const result = await db.query(
      `SELECT artwork_id, COUNT(*)::int AS total_likes
       FROM likes
       GROUP BY artwork_id`
    );

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET likes error:", error);
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
    let rawId = searchParams.get("artwork_id");

    if (!rawId) {
      try {
        const body = await request.json();
        rawId = body?.artwork_id;
      } catch {
        // Abaikan jika tidak ada body JSON
      }
    }

    const id = Number(rawId);

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
      message: "Batal menyukai karya.",
    });
  } catch (error) {
    console.error("Gagal menghapus like:", error);

    return Response.json(
      { success: false, message: "Gagal menghapus like." },
      { status: 500 }
    );
  }
}
