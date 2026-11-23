
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
         w.winner_id,
         w.rank,
         w.announced_at,
         s.submission_id,
         a.artwork_id,
         a.title AS artwork_title,
         a.image_url,
         u.username AS creator_username
       FROM challenge_winners w
       JOIN challenge_submissions s
         ON s.submission_id = w.submission_id
       JOIN artworks a
         ON a.artwork_id = s.artwork_id
       JOIN users u
         ON u.user_id = s.user_id
       WHERE w.challenge_id = $1
       ORDER BY w.rank ASC`,
      [challengeId]
    );

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Gagal mengambil pemenang:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil data pemenang." },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
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

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, message: "Format data tidak valid." },
      { status: 400 }
    );
  }

  const submissionId = Number(body.submission_id);
  const rank = Number(body.rank);

  if (
    !Number.isInteger(submissionId) ||
    submissionId <= 0 ||
    !Number.isInteger(rank) ||
    rank < 1 ||
    rank > 3
  ) {
    return Response.json(
      { success: false, message: "Submission atau peringkat tidak valid." },
      { status: 400 }
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Kunci challenge agar perubahan pemenang tidak saling bertabrakan
    const challenge = await client.query(
      `SELECT challenge_id
       FROM challenges
       WHERE challenge_id = $1
         AND curator_id = $2
         AND CURRENT_DATE > end_date
       FOR UPDATE`,
      [challengeId, user.user_id]
    );

    if (challenge.rowCount === 0) {
      await client.query("ROLLBACK");

      return Response.json(
        {
          success: false,
          message: "Challenge belum berakhir atau bukan milikmu.",
        },
        { status: 400 }
      );
    }

    const submission = await client.query(
      `SELECT submission_id
       FROM challenge_submissions
       WHERE submission_id = $1
         AND challenge_id = $2
         AND status = 'active'`,
      [submissionId, challengeId]
    );

    if (submission.rowCount === 0) {
      await client.query("ROLLBACK");

      return Response.json(
        { success: false, message: "Submission tidak ditemukan atau sudah ditarik." },
        { status: 404 }
      );
    }

    const existingWinner = await client.query(
      `SELECT winner_id, rank
       FROM challenge_winners
       WHERE challenge_id = $1
         AND submission_id = $2`,
      [challengeId, submissionId]
    );

    if (
      existingWinner.rowCount > 0 &&
      existingWinner.rows[0].rank !== rank
    ) {
      await client.query("ROLLBACK");

      return Response.json(
        { success: false, message: "Karya ini sudah memiliki peringkat lain." },
        { status: 409 }
      );
    }

    const result = await client.query(
      `INSERT INTO challenge_winners
        (challenge_id, submission_id, rank)
       VALUES ($1, $2, $3)
       ON CONFLICT (challenge_id, rank)
       DO UPDATE SET
         submission_id = EXCLUDED.submission_id,
         announced_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [challengeId, submissionId, rank]
    );

    await client.query("COMMIT");

    return Response.json({
      success: true,
      message: "Pemenang berhasil ditentukan.",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Gagal menentukan pemenang:", error);

    return Response.json(
      {
        success: false,
        message: "Gagal menentukan pemenang. Pastikan peringkat dan submission tidak duplikat.",
      },
      { status: 409 }
    );
  } finally {
    client.release();
  }
}
