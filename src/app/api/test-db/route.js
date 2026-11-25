import db from "@/lib/db";

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        NOW() AS waktu,
        current_database() AS nama_database
    `);

    return Response.json({
      success: true,
      message: "Database berhasil terhubung!",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("DATABASE ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}