import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

function invalidId(id) {
  return !id || !Number.isInteger(Number(id)) || Number(id) < 1;
}

function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function validBannerUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const trimmed = value.trim();

  if (
    /^\/uploads\/banners\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(
      trimmed
    )
  ) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// GET: Mengambil detail challenge
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

    const result = await db.query(
      `SELECT
         c.challenge_id,
         c.curator_id,
         c.title,
         c.description,
         c.rules,
         c.reward,
         c.banner_url,
         TO_CHAR(c.start_date, 'YYYY-MM-DD') AS start_date,
         TO_CHAR(c.end_date, 'YYYY-MM-DD') AS end_date,
         c.created_at,
         u.username AS curator_username,
         COUNT(DISTINCT s.submission_id) FILTER (
           WHERE s.status = 'active'
         )::int AS total_submissions
       FROM challenges c
       JOIN users u ON u.user_id = c.curator_id
       LEFT JOIN challenge_submissions s
         ON s.challenge_id = c.challenge_id
       WHERE c.challenge_id = $1
       GROUP BY c.challenge_id, u.username`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Challenge tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("GET CHALLENGE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil detail challenge." },
      { status: 500 }
    );
  }
}

// PATCH: Mengedit challenge milik Curator
export async function PATCH(request, { params }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Request tidak valid." },
      { status: 403 }
    );
  }

  const { user, error } = await requireRole(["curator"]);
  if (error) return error;

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

    const existing = await db.query(
      `SELECT
         challenge_id,
         curator_id,
         title,
         description,
         rules,
         reward,
         banner_url,
         TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
         TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date
       FROM challenges
       WHERE challenge_id = $1
         AND curator_id = $2`,
      [id, user.user_id]
    );

    if (existing.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Challenge tidak ditemukan atau bukan milikmu." },
        { status: 404 }
      );
    }

    const current = existing.rows[0];

    const title = body.title ?? current.title;
    const description = body.description ?? current.description;
    const rules = body.rules ?? current.rules;
    const reward = body.reward ?? current.reward;
    const banner_url = body.banner_url ?? current.banner_url;

    const start_date = body.start_date
      ? String(body.start_date).slice(0, 10)
      : String(current.start_date).slice(0, 10);

    const end_date = body.end_date
      ? String(body.end_date).slice(0, 10)
      : String(current.end_date).slice(0, 10);

    if (
      typeof title !== "string" ||
      typeof description !== "string" ||
      typeof rules !== "string" ||
      typeof reward !== "string" ||
      typeof banner_url !== "string" ||
      !title.trim() ||
      !description.trim() ||
      !rules.trim() ||
      !reward.trim() ||
      !banner_url.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Semua data challenge wajib diisi, termasuk banner challenge." },
        { status: 400 }
      );
    }

    if (title.trim().length > 150) {
      return NextResponse.json(
        { success: false, message: "Judul maksimal 150 karakter." },
        { status: 400 }
      );
    }

    if (
      !validDate(start_date) ||
      !validDate(end_date) ||
      end_date <= start_date
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal tidak valid. Tanggal akhir harus setelah tanggal mulai.",
        },
        { status: 400 }
      );
    }

    if (!validBannerUrl(banner_url.trim())) {
      return NextResponse.json(
        { success: false, message: "File atau URL banner tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE challenges
       SET
         title = $1,
         description = $2,
         rules = $3,
         reward = $4,
         banner_url = $5,
         start_date = $6::date,
         end_date = $7::date
       WHERE challenge_id = $8
         AND curator_id = $9
       RETURNING
         challenge_id,
         curator_id,
         title,
         description,
         rules,
         reward,
         banner_url,
         TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
         TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
         created_at`,
      [
        title.trim(),
        description.trim(),
        rules.trim(),
        reward.trim(),
        banner_url.trim(),
        start_date,
        end_date,
        id,
        user.user_id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Challenge berhasil diperbarui.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("PATCH CHALLENGE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal memperbarui challenge." },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus challenge milik Curator
export async function DELETE(request, { params }) {
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

    client = await db.connect();

    await client.query("BEGIN");

    const challenge = await client.query(
      `SELECT challenge_id
       FROM challenges
       WHERE challenge_id = $1
         AND curator_id = $2
       FOR UPDATE`,
      [id, user.user_id]
    );

    if (challenge.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "Challenge tidak ditemukan atau bukan milikmu." },
        { status: 404 }
      );
    }

    await client.query(
      `DELETE FROM challenge_winners
       WHERE challenge_id = $1`,
      [id]
    );

    await client.query(
      `DELETE FROM challenge_submissions
       WHERE challenge_id = $1`,
      [id]
    );

    await client.query(
      `DELETE FROM challenges
       WHERE challenge_id = $1
         AND curator_id = $2`,
      [id, user.user_id]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Challenge berhasil dihapus.",
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");

    console.error("DELETE CHALLENGE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal menghapus challenge." },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
