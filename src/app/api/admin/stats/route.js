import db from "@/lib/db";
import { requireRole } from "@/lib/get-user";

export async function GET() {
  const { error } = await requireRole(["admin"]);

  if (error) return error;

  try {
    const result = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM users
          WHERE role = 'member') AS total_members,

         (SELECT COUNT(*) FROM users
          WHERE role = 'curator'
            AND curator_status = 'approved') AS total_curators,

         (SELECT COUNT(*) FROM users
          WHERE role = 'curator'
            AND curator_status = 'pending') AS pending_curators,

         (SELECT COUNT(*) FROM artworks
          WHERE status = 'published') AS total_artworks,

         (SELECT COUNT(*) FROM categories) AS total_categories,

         (SELECT COUNT(*) FROM challenges) AS total_challenges,

         (SELECT COUNT(*) FROM challenges
          WHERE CURRENT_DATE BETWEEN start_date::date AND end_date::date) AS active_challenges,

         (SELECT COUNT(*) FROM reports
          WHERE status = 'pending') AS pending_reports,

         (SELECT COUNT(*) FROM comments) AS total_comments,

         (SELECT COUNT(*) FROM likes) AS total_likes`
    );

    const stats = result.rows[0];

    return Response.json({
      success: true,
      data: Object.fromEntries(
        Object.entries(stats).map(([key, value]) => [
          key,
          Number(value),
        ])
      ),
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Gagal mengambil statistik platform." },
      { status: 500 }
    );
  }
}
