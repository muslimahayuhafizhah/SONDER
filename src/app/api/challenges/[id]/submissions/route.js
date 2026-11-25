import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  getCurrentUser,
  requireRole,
  isSameOriginRequest,
} from "@/lib/get-user";

function invalidId(id) {
  return !id || !Number.isInteger(Number(id)) || Number(id) < 1;
}

// GET: Menampilkan submission aktif pada challenge
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
      {
        success: false,
        message: "Terjadi masalah pada database saat mengambil daftar submission.",
      },
      { status: 500 }
    );
  }
}

// POST: Member mengirim karya ke challenge
export async function POST(request, { params }) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { success: false, message: "Permintaan tidak valid (origin tidak sesuai)." },
        { status: 403 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Kamu belum login. Silakan login terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    if (user.role !== "member") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akun kamu bukan Member. Hanya Member yang dapat mengirim karya ke challenge.",
        },
        { status: 403 }
      );
    }

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
        { success: false, message: "Format data permintaan tidak valid." },
        { status: 400 }
      );
    }

    const artworkId = Number(body.artwork_id);

    if (!Number.isInteger(artworkId) || artworkId < 1) {
      return NextResponse.json(
        { success: false, message: "Pilih karya yang valid terlebih dahulu." },
        { status: 400 }
      );
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // 1. Periksa keberadaan challenge dan status periodenya menggunakan CURRENT_DATE
      const challengeRes = await client.query(
        `SELECT
           challenge_id,
           CURRENT_DATE < start_date::date AS is_before_start,
           CURRENT_DATE > end_date::date AS is_after_end
         FROM challenges
         WHERE challenge_id = $1
         FOR UPDATE`,
        [id]
      );

      if (challengeRes.rowCount === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message: "Challenge tidak ditemukan.",
          },
          { status: 404 }
        );
      }

      const challengeInfo = challengeRes.rows[0];

      if (challengeInfo.is_before_start) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message:
              "Challenge belum dimulai. Karya hanya dapat dikirim saat periode challenge berlangsung.",
          },
          { status: 400 }
        );
      }

      if (challengeInfo.is_after_end) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message:
              "Periode challenge sudah berakhir. Pengiriman karya sudah ditutup.",
          },
          { status: 400 }
        );
      }

      // 2. Periksa keberadaan karya, kepemilikan, dan status publikasinya secara spesifik
      const artworkRes = await client.query(
        `SELECT artwork_id, user_id, status, source_type, title, image_url
         FROM artworks
         WHERE artwork_id = $1`,
        [artworkId]
      );

      if (artworkRes.rowCount === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message: "Karya tidak ditemukan.",
          },
          { status: 404 }
        );
      }

      const artworkInfo = artworkRes.rows[0];

      if (
        artworkInfo.source_type !== "member" ||
        Number(artworkInfo.user_id) !== Number(user.user_id)
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message:
              "Karya bukan milik pengguna. Kamu hanya dapat mengirim karya milikmu sendiri.",
          },
          { status: 403 }
        );
      }

      if (artworkInfo.status !== "published") {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message:
              "Karya tidak berstatus dipublikasikan (published) sehingga tidak dapat dikirim ke challenge.",
          },
          { status: 400 }
        );
      }

      // 3. Periksa apakah Member sudah memiliki submission pada challenge ini
      const existing = await client.query(
        `SELECT cs.submission_id, cs.status, cw.winner_id
         FROM challenge_submissions cs
         LEFT JOIN challenge_winners cw
           ON cs.submission_id = cw.submission_id
         WHERE cs.challenge_id = $1
           AND cs.user_id = $2
         FOR UPDATE OF cs`,
        [id, user.user_id]
      );

      if (existing.rowCount > 0) {
        const currentSubmission = existing.rows[0];

        if (currentSubmission.winner_id) {
          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              message:
                "Submission yang sudah menjadi pemenang tidak dapat diubah atau diganti.",
            },
            { status: 409 }
          );
        }

        if (currentSubmission.status === "active") {
          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              message:
                "Kamu sudah memiliki submission aktif pada challenge ini. Tarik karya terlebih dahulu jika ingin mengirim karya lain.",
            },
            { status: 409 }
          );
        }

        // Jika submission sebelumnya berstatus 'withdrawn', aktifkan kembali dengan karya baru
        const updated = await client.query(
          `UPDATE challenge_submissions
           SET artwork_id = $1,
               submitted_at = CURRENT_TIMESTAMP,
               status = 'active'
           WHERE submission_id = $2
           RETURNING *`,
          [artworkId, currentSubmission.submission_id]
        );

        await client.query("COMMIT");

        return NextResponse.json(
          {
            success: true,
            message: "Karya berhasil dikirim ulang ke challenge.",
            data: {
              ...updated.rows[0],
              title: artworkInfo.title,
              image_url: artworkInfo.image_url,
              username: user.username,
            },
          },
          { status: 200 }
        );
      }

      const result = await client.query(
        `INSERT INTO challenge_submissions
           (challenge_id, artwork_id, user_id, submitted_at, status)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'active')
         RETURNING *`,
        [id, artworkId, user.user_id]
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          success: true,
          message: "Karya berhasil dikirim ke challenge.",
          data: {
            ...result.rows[0],
            title: artworkInfo.title,
            image_url: artworkInfo.image_url,
            username: user.username,
          },
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
      {
        success: false,
        message: "Terjadi masalah penyimpanan database saat mengirim karya ke challenge.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Member menarik submission
export async function DELETE(request, { params }) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { success: false, message: "Permintaan tidak valid (origin tidak sesuai)." },
        { status: 403 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Kamu belum login. Silakan login terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    if (user.role !== "member") {
      return NextResponse.json(
        {
          success: false,
          message: "Akun kamu bukan Member. Hanya Member yang dapat menarik submission.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (invalidId(id)) {
      return NextResponse.json(
        { success: false, message: "ID challenge tidak valid." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    let rawSubmissionId = searchParams.get("submission_id");

    if (!rawSubmissionId) {
      try {
        const body = await request.json();
        rawSubmissionId = body?.submission_id;
      } catch {
        // Abaikan jika tidak ada body JSON
      }
    }

    const submissionId = Number(rawSubmissionId);

    if (!Number.isInteger(submissionId) || submissionId < 1) {
      return NextResponse.json(
        { success: false, message: "ID submission tidak valid." },
        { status: 400 }
      );
    }

    // Periksa terlebih dahulu alasan spesifik jika tidak dapat ditarik
    const checkRes = await db.query(
      `SELECT
         cs.submission_id,
         cs.user_id,
         cs.status,
         cw.winner_id,
         CURRENT_DATE < c.start_date::date AS is_before_start,
         CURRENT_DATE > c.end_date::date AS is_after_end
       FROM challenge_submissions cs
       JOIN challenges c ON c.challenge_id = cs.challenge_id
       LEFT JOIN challenge_winners cw ON cw.submission_id = cs.submission_id
       WHERE cs.submission_id = $1
         AND cs.challenge_id = $2`,
      [submissionId, id]
    );

    if (checkRes.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Submission tidak ditemukan pada challenge ini." },
        { status: 404 }
      );
    }

    const subInfo = checkRes.rows[0];

    if (Number(subInfo.user_id) !== Number(user.user_id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Kamu tidak dapat menarik submission milik pengguna lain.",
        },
        { status: 403 }
      );
    }

    if (subInfo.winner_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Submission yang sudah menjadi pemenang tidak dapat ditarik.",
        },
        { status: 409 }
      );
    }

    if (subInfo.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message: "Submission ini sudah berstatus ditarik (withdrawn).",
        },
        { status: 400 }
      );
    }

    if (subInfo.is_before_start || subInfo.is_after_end) {
      return NextResponse.json(
        {
          success: false,
          message: "Penarikan submission hanya dapat dilakukan selama periode challenge berlangsung.",
        },
        { status: 400 }
      );
    }

    await db.query(
      `UPDATE challenge_submissions
       SET status = 'withdrawn'
       WHERE submission_id = $1
         AND challenge_id = $2
         AND user_id = $3`,
      [submissionId, id, user.user_id]
    );

    return NextResponse.json({
      success: true,
      message: "Submission berhasil ditarik.",
    });
  } catch (error) {
    console.error("DELETE SUBMISSION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi masalah penyimpanan database saat menarik submission.",
      },
      { status: 500 }
    );
  }
}
