
import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const challengeId = Number(id);

    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      return Response.json(
        { success: false, message: "ID challenge tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `SELECT
         c.*,
         u.username AS curator_username,
         COUNT(DISTINCT s.submission_id) FILTER (
           WHERE s.status = 'active'
         ) AS total_submissions
       FROM challenges c
       JOIN users u ON u.user_id = c.curator_id
       LEFT JOIN challenge_submissions s
         ON s.challenge_id = c.challenge_id
       WHERE c.challenge_id = $1
       GROUP BY c.challenge_id, u.username`,
      [challengeId]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, message: "Challenge tidak ditemukan." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Gagal mengambil detail challenge:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil detail challenge." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

    const { user, error } = await requireRole(["curator"]);
    if (error) return error;

    const { id } = await params;
    const challengeId = Number(id);

    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      return Response.json(
        { success: false, message: "ID challenge tidak valid." },
        { status: 400 }
      );
    }

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
        { success: false, message: "Tanggal akhir harus setelah tanggal mulai." },
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
      `UPDATE challenges
       SET title = $1,
           description = $2,
           rules = $3,
           reward = $4,
           banner_url = $5,
           start_date = $6,
           end_date = $7
       WHERE challenge_id = $8
         AND curator_id = $9
       RETURNING *`,
      [
        title.trim(),
        description.trim(),
        rules.trim(),
        reward.trim(),
        banner_url.trim(),
        start_date,
        end_date,
        challengeId,
        user.user_id,
      ]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, message: "Challenge tidak ditemukan atau bukan milikmu." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Challenge berhasil diperbarui.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Gagal mengedit challenge:", error);

    return Response.json(
      { success: false, message: "Gagal memperbarui challenge." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, message: "Request tidak valid." },
      { status: 403 }
    );
  }

  const { user, error } = await requireRole(["curator"]);
  if (error) return error;

  const { id } = await params;
  const challengeId = Number(id);

  if (!Number.isInteger(challengeId) || challengeId <= 0) {
    return Response.json(
      { success: false, message: "ID challenge tidak valid." },
      { status: 400 }
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const challenge = await client.query(
      `SELECT challenge_id
       FROM challenges
       WHERE challenge_id = $1
         AND curator_id = $2
       FOR UPDATE`,
      [challengeId, user.user_id]
    );

    if (challenge.rowCount === 0) {
      await client.query("ROLLBACK");

      return Response.json(
        { success: false, message: "Challenge tidak ditemukan atau bukan milikmu." },
        { status: 404 }
      );
    }

    await client.query(
      `DELETE FROM challenge_winners
       WHERE challenge_id = $1`,
      [challengeId]
    );

    await client.query(
      `DELETE FROM challenge_submissions
       WHERE challenge_id = $1`,
      [challengeId]
    );

    await client.query(
      `DELETE FROM challenges
       WHERE challenge_id = $1`,
      [challengeId]
    );

    await client.query("COMMIT");

    return Response.json({
      success: true,
      message: "Challenge berhasil dihapus.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Gagal menghapus challenge:", error);

    return Response.json(
      { success: false, message: "Gagal menghapus challenge." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
