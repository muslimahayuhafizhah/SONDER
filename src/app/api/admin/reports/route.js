import db from "@/lib/db";
import { requireRole } from "@/lib/get-user";

export async function GET() {
  const { error } = await requireRole(["admin"]);

  if (error) return error;

  try {
    const result = await db.query(
      `SELECT
         r.report_id,
         r.artwork_id,
         r.reporter_id,
         r.reason,
         r.status,
         r.created_at,
         a.title AS artwork_title,
         a.image_url,
         a.status AS artwork_status,
         u.username AS reporter_username
       FROM reports r
       JOIN artworks a ON r.artwork_id = a.artwork_id
       JOIN users u ON r.reporter_id = u.user_id
       ORDER BY
         CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
         r.created_at DESC`
    );

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Gagal mengambil laporan." },
      { status: 500 }
    );
  }
}