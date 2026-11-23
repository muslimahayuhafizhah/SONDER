
import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        c.*,
        u.username AS curator_username,
        COUNT(DISTINCT s.submission_id) FILTER (
          WHERE s.status = 'active'
        ) AS total_submissions
      FROM challenges c
      JOIN users u ON u.user_id = c.curator_id
      LEFT JOIN challenge_submissions s
        ON s.challenge_id = c.challenge_id
      GROUP BY c.challenge_id, u.username
      ORDER BY c.created_at DESC
    `);

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Gagal mengambil challenge:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil data challenge." },
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

    const { user, error } = await requireRole(["curator"]);
    if (error) return error;

    const body = await request.json();

    const {
      title,
      description,
      rules,
      reward,
      banner_url,
      start_date,
      end_date,
    } = body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !rules?.trim() ||
      !reward?.trim() ||
      !banner_url?.trim() ||
      !start_date ||
      !end_date
    ) {
      return Response.json(
        { success: false, message: "Semua data challenge wajib diisi." },
        { status: 400 }
      );
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return Response.json(
        { success: false, message: "Tanggal challenge tidak valid. Tanggal akhir harus setelah tanggal mulai." },
        { status: 400 }
      );
    }

    try {
      new URL(banner_url);
    } catch {
      return Response.json(
        { success: false, message: "URL banner tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO challenges
        (curator_id, title, description, rules, reward, banner_url, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        user.user_id,
        title.trim(),
        description.trim(),
        rules.trim(),
        reward.trim(),
        banner_url.trim(),
        start_date,
        end_date,
      ]
    );

    return Response.json(
      {
        success: true,
        message: "Challenge berhasil dibuat.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Gagal membuat challenge:", error);

    return Response.json(
      { success: false, message: "Gagal membuat challenge." },
      { status: 500 }
    );
  }
}
