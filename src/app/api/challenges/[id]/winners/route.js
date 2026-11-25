import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

function invalidId(id) {
  return !id || !Number.isInteger(Number(id)) || Number(id) < 1;
}

// GET: Mengambil daftar pemenang challenge dari database
export async function GET(request, { params }) {
  try {
    const { error } = await requireRole(["member", "curator"]);
    if (error) return error;

    const { id } = await params;

    if (invalidId(id)) {
      return NextResponse.json(
        { success: false, message: "ID challenge tidak valid." },
        { status: 400 }
      );
    }

    const challenge = await db.query(
      `SELECT challenge_id
       FROM challenges
       WHERE challenge_id = $1`,
      [id]
    );

    if (challenge.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Challenge tidak ditemukan." },
        { status: 404 }
      );
    }

    const result = await db.query(
      `SELECT
         w.winner_id,
         w.challenge_id,
         w.submission_id,
         w.rank,
         w.announced_at,
         s.user_id,
         a.artwork_id,
         a.title,
         a.image_url,
         u.username
       FROM challenge_winners w
       JOIN challenge_submissions s
         ON s.submission_id = w.submission_id
       JOIN artworks a
         ON a.artwork_id = s.artwork_id
       JOIN users u
         ON u.user_id = s.user_id
       WHERE w.challenge_id = $1
       ORDER BY w.rank ASC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET WINNERS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data pemenang." },
      { status: 500 }
    );
  }
}

// POST: Curator pemilik challenge menentukan pemenang (Juara 1, 2, atau 3)
export async function POST(request, { params }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Request tidak valid." },
      { status: 403 }
    );
  }

  const { user, error } = await requireRole(["curator"]);
  if (error) return error;

  let client;

  try {
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
      !Number.isInteger(rank) ||
      rank < 1 ||
      rank > 3
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Submission dan peringkat (Juara 1, 2, atau 3) wajib dipilih dengan benar.",
        },
        { status: 400 }
      );
    }

    client = await db.connect();

    await client.query("BEGIN");

    // 1. Periksa keberadaan challenge, kepemilikan Curator, dan apakah periode sudah berakhir
    const challengeRes = await client.query(
      `SELECT
         challenge_id,
         curator_id,
         CURRENT_DATE > end_date::date AS has_ended
       FROM challenges
       WHERE challenge_id = $1
       FOR UPDATE`,
      [id]
    );

    if (challengeRes.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "Challenge tidak ditemukan." },
        { status: 404 }
      );
    }

    const challengeInfo = challengeRes.rows[0];

    if (Number(challengeInfo.curator_id) !== Number(user.user_id)) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message:
            "Kamu tidak memiliki akses untuk menentukan pemenang pada challenge milik Curator lain.",
        },
        { status: 403 }
      );
    }

    if (!challengeInfo.has_ended) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message:
            "Challenge belum berakhir. Pemenang hanya dapat ditentukan setelah melewati tanggal berakhir challenge.",
        },
        { status: 400 }
      );
    }

    // 2. Pastikan submission aktif, berasal dari challenge ini, dan karyanya berstatus published
    const submission = await client.query(
      `SELECT cs.submission_id, a.title, u.username
       FROM challenge_submissions cs
       JOIN artworks a ON a.artwork_id = cs.artwork_id
       JOIN users u ON u.user_id = cs.user_id
       WHERE cs.submission_id = $1
         AND cs.challenge_id = $2
         AND cs.status = 'active'
         AND a.status = 'published'
       FOR UPDATE OF cs`,
      [submissionId, id]
    );

    if (submission.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Submission tidak ditemukan, sudah ditarik, atau karya tidak aktif.",
        },
        { status: 404 }
      );
    }

    // 3. Satu submission hanya boleh memperoleh satu peringkat
    const existingSubmission = await client.query(
      `SELECT winner_id, rank
       FROM challenge_winners
       WHERE submission_id = $1`,
      [submissionId]
    );

    if (existingSubmission.rowCount > 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: `Karya ini sudah ditetapkan sebagai Juara ${existingSubmission.rows[0].rank}.`,
        },
        { status: 409 }
      );
    }

    // 4. Satu peringkat hanya boleh dimiliki satu pemenang pada challenge yang sama
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
          message: `Peringkat Juara ${rank} sudah memiliki pemenang.`,
        },
        { status: 409 }
      );
    }

    // 5. Maksimal 3 pemenang per challenge
    const totalWinners = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM challenge_winners
       WHERE challenge_id = $1`,
      [id]
    );

    if (Number(totalWinners.rows[0].total) >= 3) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "Maksimal hanya tiga pemenang untuk setiap challenge." },
        { status: 400 }
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
        message: `Berhasil menetapkan "${submission.rows[0].title}" sebagai Juara ${rank}.`,
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (client) await client.query("ROLLBACK");

    console.error("POST WINNER ERROR:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "Submission atau peringkat tersebut sudah digunakan.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal menentukan pemenang." },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
