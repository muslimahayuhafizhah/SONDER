
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

function invalidId(id) {
  return !id || !Number.isInteger(Number(id)) || Number(id) < 1;
}

// GET: Menampilkan pemenang challenge
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (invalidId(id)) {
      return NextResponse.json(
        { success: false, message: "ID challenge tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `SELECT
         cw.winner_id,
         cw.challenge_id,
         cw.submission_id,
         cw.rank,
         cw.announced_at,
         cs.artwork_id,
         a.title,
         a.image_url,
         u.username
       FROM challenge_winners cw
       JOIN challenge_submissions cs
         ON cw.submission_id = cs.submission_id
       JOIN artworks a
         ON cs.artwork_id = a.artwork_id
       JOIN users u
         ON cs.user_id = u.user_id
       WHERE cw.challenge_id = $1
       ORDER BY cw.rank ASC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET WINNERS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar pemenang." },
      { status: 500 }
    );
  }
}

// POST: Curator menetapkan pemenang
export async function POST(request, { params }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Permintaan tidak valid." },
      { status: 403 }
    );
  }

  const { user, error } = await requireRole(["curator"]);

  if (error) return error;

  const { id } = await params;

  if (invalidId(id)) {
    return NextResponse.json(
      { success: false, message: "ID challenge tidak valid." },
      { status: 400 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Format data tidak valid." },
      { status: 400 }
    );
  }

  const submissionId = Number(body.submission_id);
  const rank = Number(body.rank);

  if (
    !Number.isInteger(submissionId) ||
    submissionId < 1 ||
    ![1, 2, 3].includes(rank)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Submission atau peringkat tidak valid.",
      },
      { status: 400 }
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Pastikan challenge milik Curator yang sedang login
    // dan tanggal challenge sudah berakhir.
    const challenge = await client.query(
      `SELECT challenge_id
       FROM challenges
       WHERE challenge_id = $1
         AND curator_id = $2
         AND CURRENT_DATE > end_date
       FOR UPDATE`,
      [id, user.user_id]
    );

    if (challenge.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message:
            "Challenge tidak ditemukan, bukan milikmu, atau belum berakhir.",
        },
        { status: 400 }
      );
    }

    // Pastikan submission berasal dari challenge ini
    // dan belum ditarik oleh Member.
    const submission = await client.query(
      `SELECT submission_id
       FROM challenge_submissions
       WHERE submission_id = $1
         AND challenge_id = $2
         AND status = 'active'`,
      [submissionId, id]
    );

    if (submission.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Submission tidak ditemukan atau sudah ditarik.",
        },
        { status: 400 }
      );
    }

    // Maksimal tiga pemenang.
    const winnerCount = await client.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM challenge_winners
       WHERE challenge_id = $1`,
      [id]
    );

    if (winnerCount.rows[0].total >= 3) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Challenge sudah memiliki tiga pemenang.",
        },
        { status: 400 }
      );
    }

    // Satu peringkat hanya boleh diisi satu pemenang.
    const existingRank = await client.query(
      `SELECT winner_id
       FROM challenge_winners
       WHERE challenge_id = $1
         AND rank = $2`,
      [id, rank]
    );

    if (existingRank.rowCount > 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: `Peringkat ${rank} sudah memiliki pemenang.`,
        },
        { status: 409 }
      );
    }

    // Satu submission hanya boleh menjadi pemenang satu kali.
    const existingSubmission = await client.query(
      `SELECT winner_id
       FROM challenge_winners
       WHERE submission_id = $1`,
      [submissionId]
    );

    if (existingSubmission.rowCount > 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Karya tersebut sudah ditetapkan sebagai pemenang.",
        },
        { status: 409 }
      );
    }

    const result = await client.query(
      `INSERT INTO challenge_winners
         (challenge_id, submission_id, rank, announced_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, submissionId, rank]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Pemenang berhasil diumumkan.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST WINNER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal menetapkan pemenang." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
