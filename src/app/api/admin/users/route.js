import db from "@/lib/db";
import { requireRole } from "@/lib/get-user";

export async function GET() {
  const { error } = await requireRole(["admin"]);

  if (error) return error;

  try {
    const result = await db.query(
      `SELECT
         user_id,
         username,
         email,
         role,
         curator_status,
         created_at
       FROM users
       WHERE role IN ('member', 'curator')
       ORDER BY created_at DESC`
    );

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Gagal mengambil data pengguna." },
      { status: 500 }
    );
  }
}