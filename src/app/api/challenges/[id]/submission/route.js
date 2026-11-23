
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
         s.submission_id,
         s.challenge_id,
         s.user_id,
         s.artwork_id,
         s.submitted_at,
         s.status,
         u.username,
         a.title AS artwork_title,
         a.image_url,
         a.description AS artwork_description
       FROM challenge_submissions s
       JOIN users u ON u.user_id = s.user_id
       JOIN artworks a ON a.artwork_id = s.artwork_id
       WHERE s.challenge_id = $1
         AND s.status = 'active'
       ORDER BY s.submitted_at ASC`,
      [challengeId]
    );

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Gagal mengambil submission:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil submission." },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

    const { user, error } = await requireRole(["member"]);
    if (error) return error;

    const { id } = await params;
    const challengeId = Number(id);

    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      return Response.json(
        { success: false, message: "ID challenge tidak valid." },
        { status: 400 }
      );
    }

    const { artwork_id } = await request.json();
    const artworkId = Number(artwork_id);

    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return Response.json(
        { success: false, message: "ID karya tidak valid." },
        { status: 400 }
      );
    }

    const challenge = await db.query(
      `SELECT challenge_id
       FROM challenges
       WHERE challenge_id = $1
         AND CURRENT_DATE BETWEEN start_date AND end_date`,
      [challengeId]
    );

    if (challenge.rowCount === 0) {
      return Response.json(
        { success: false, message: "Challenge belum dimulai atau sudah berakhir." },
        { status: 400 }
      );
    }

    const artwork = await db.query(
      `SELECT artwork_id
       FROM artworks
       WHERE artwork_id = $1
         AND user_id = $2
         AND source_type = 'member'
         AND status = 'published'`,
      [artworkId, user.user_id]
    );

    if (artwork.rowCount === 0) {
      return Response.json(
        { success: false, message: "Karya tidak ditemukan atau bukan milikmu." },
        { status: 404 }
      );
    }

    const result = await db.query(
      `INSERT INTO challenge_submissions
        (challenge_id, artwork_id, user_id, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (challenge_id, user_id)
       DO UPDATE SET
         artwork_id = EXCLUDED.artwork_id,
         status = 'active',
         submitted_at = CURRENT_TIMESTAMP
       WHERE challenge_submissions.status = 'withdrawn'
       RETURNING *`,
      [challengeId, artworkId, user.user_id]
    );

    if (result.rowCount === 0) {
      return Response.json(
        {
          success: false,
          message: "Kamu sudah mengirim karya ke challenge ini.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Karya berhasil dikirim ke challenge.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Gagal mengirim submission:", error);

    return Response.json(
      { success: false, message: "Gagal mengirim karya." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

    const { user, error } = await requireRole(["member"]);
    if (error) return error;

    const { id } = await params;
    const challengeId = Number(id);

    if (!Number.isInteger(challengeId) || challengeId <= 0) {
      return Response.json(
        { success: false, message: "ID challenge tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE challenge_submissions
       SET status = 'withdrawn'
       WHERE challenge_id = $1
         AND user_id = $2
         AND status = 'active'
         AND EXISTS (
           SELECT 1 FROM challenges c
           WHERE c.challenge_id = $1
             AND CURRENT_TIMESTAMP BETWEEN c.start_date AND c.end_date
         )
       RETURNING submission_id`,
      [challengeId, user.user_id]
    );

    if (result.rowCount === 0) {
      return Response.json(
        {
          success: false,
          message: "Submission tidak ditemukan atau challenge sudah tidak aktif.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Submission berhasil ditarik.",
    });
  } catch (error) {
    console.error("Gagal menarik submission:", error);

    return Response.json(
      { success: false, message: "Gagal menarik submission." },
      { status: 500 }
    );
  }
}
