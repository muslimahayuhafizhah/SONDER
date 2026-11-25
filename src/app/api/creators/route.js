import db from "@/lib/db";
import { requireRole } from "@/lib/get-user";

export async function GET(request) {
  try {
    const { error } = await requireRole(["member", "curator"]);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const creatorId = Number(id);

      if (!Number.isInteger(creatorId) || creatorId <= 0) {
        return Response.json(
          { success: false, message: "ID kreator tidak valid." },
          { status: 400 }
        );
      }

      const creatorRes = await db.query(
        `SELECT
           user_id,
           username,
           bio,
           profile_image,
           external_link,
           created_at
         FROM users
         WHERE user_id = $1
           AND role = 'member'`,
        [creatorId]
      );

      if (creatorRes.rowCount === 0) {
        return Response.json(
          { success: false, message: "Kreator tidak ditemukan." },
          { status: 404 }
        );
      }

      const artworksRes = await db.query(
        `SELECT
           a.artwork_id,
           a.user_id,
           a.category_id,
           a.title,
           a.description,
           a.image_url,
           a.tags,
           a.created_at,
           c.category_name,
           (
             SELECT COUNT(*)::int
             FROM likes l
             WHERE l.artwork_id = a.artwork_id
           ) AS total_likes
         FROM artworks a
         JOIN categories c ON c.category_id = a.category_id
         WHERE a.user_id = $1
           AND a.status = 'published'
         ORDER BY a.created_at DESC`,
        [creatorId]
      );

      return Response.json({
        success: true,
        data: {
          creator: creatorRes.rows[0],
          artworks: artworksRes.rows,
        },
      });
    }

    const result = await db.query(
      `SELECT
         u.user_id,
         u.username,
         u.bio,
         u.profile_image,
         u.external_link,
         u.created_at,
         COUNT(a.artwork_id) FILTER (WHERE a.status = 'published')::int AS total_artworks
       FROM users u
       LEFT JOIN artworks a ON a.user_id = u.user_id
       WHERE u.role = 'member'
       GROUP BY u.user_id
       ORDER BY total_artworks DESC, u.created_at DESC`
    );

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET CREATORS ERROR:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil data kreator." },
      { status: 500 }
    );
  }
}
