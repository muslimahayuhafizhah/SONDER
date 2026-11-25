
import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  requireRole,
  isSameOriginRequest,
} from "@/lib/get-user";

function invalidId(id) {
  return !id || !Number.isInteger(Number(id)) || Number(id) < 1;
}

// GET: Menampilkan submission aktif
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (invalidId(id)) {
      return NextResponse.json(
        { success: false, message: "ID challenge tidak valid." },
        { status: 400 }
      );
    }

    const challenge = await db.query(
      "SELECT challenge_id FROM challenges WHERE challenge_id = $1",
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
         cs.submission_id,
         cs.challenge_id,
         cs.artwork_id,
         cs.user_id,
         cs.submitted_at,
         cs.status,
         a.title,
         a.image_url,
         u.username
       FROM challenge_submissions cs
       JOIN artworks a ON cs.artwork_id = a.artwork_id
       JOIN users u ON cs.user_id = u.user_id
       WHERE cs.challenge_id = $1
         AND cs.status = 'active'
         AND a.status = 'published'
       ORDER BY cs.submitted_at DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET SUBMISSIONS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil submission." },
      { status: 500 }
    );
  }
}

// POST: Member mengirim karya ke challenge
export async function POST(request, { params }) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { success: false, message: "Permintaan tidak valid." },
        { status: 403 }
      );
    }

    const { user, error } = await requireRole(["member"]);
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

    const artworkId = Number(body.artwork_id);

    if (!Number.isInteger(artworkId) || artworkId < 1) {
      return NextResponse.json(
        { success: false, message: "Pilih karya yang valid." },
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
           AND CURRENT_DATE BETWEEN start_date AND end_date
         FOR UPDATE`,
        [id]
      );

      if (challenge.rowCount === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message: "Challenge tidak ditemukan atau sudah di luar periode.",
          },
          { status: 400 }
        );
      }

      const artwork = await client.query(
        `SELECT artwork_id
         FROM artworks
         WHERE artwork_id = $1
           AND user_id = $2
           AND status = 'published'`,
        [artworkId, user.user_id]
      );

      if (artwork.rowCount === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message: "Karya tidak ditemukan atau bukan milikmu.",
          },
          { status: 400 }
        );
      }

      const existing = await client.query(
        `SELECT cs.submission_id, cw.winner_id
         FROM challenge_submissions cs
         LEFT JOIN challenge_winners cw
           ON cs.submission_id = cw.submission_id
         WHERE cs.challenge_id = $1
           AND cs.user_id = $2`,
        [id, user.user_id]
      );

      if (existing.rows[0]?.winner_id) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message: "Submission yang sudah menjadi pemenang tidak dapat diubah.",
          },
          { status: 400 }
        );
      }

      const result = await client.query(
        `INSERT INTO challenge_submissions
           (challenge_id, artwork_id, user_id, submitted_at, status)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'active')
         ON CONFLICT (challenge_id, user_id)
         DO UPDATE SET
           artwork_id = EXCLUDED.artwork_id,
           submitted_at = CURRENT_TIMESTAMP,
           status = 'active'
         RETURNING *`,
        [id, artworkId, user.user_id]
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          success: true,
          message: "Karya berhasil dikirim ke challenge.",
          data: result.rows[0],
        },
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST SUBMISSION ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengirim karya." },
      { status: 500 }
    );
  }
}

// DELETE: Member menarik submission
export async function DELETE(request, { params }) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { success: false, message: "Permintaan tidak valid." },
        { status: 403 }
      );
    }

    const { user, error } = await requireRole(["member"]);
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

    if (!Number.isInteger(submissionId) || submissionId < 1) {
      return NextResponse.json(
        { success: false, message: "ID submission tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE challenge_submissions cs
       SET status = 'withdrawn'
       FROM challenges c
       WHERE cs.submission_id = $1
         AND cs.challenge_id = c.challenge_id
         AND cs.challenge_id = $2
         AND cs.user_id = $3
         AND cs.status = 'active'
         AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
         AND NOT EXISTS (
           SELECT 1
           FROM challenge_winners cw
           WHERE cw.submission_id = cs.submission_id
         )
       RETURNING cs.submission_id`,
      [submissionId, id, user.user_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Submission tidak ditemukan atau tidak dapat ditarik pada periode ini.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Submission berhasil ditarik.",
    });
  } catch (error) {
    console.error("DELETE SUBMISSION ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal menarik submission." },
      { status: 500 }
    );
  }
}
