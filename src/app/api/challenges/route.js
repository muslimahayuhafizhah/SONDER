
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

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

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// GET: Menampilkan seluruh challenge
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

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET CHALLENGES ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data challenge." },
      { status: 500 }
    );
  }
}

// POST: Curator membuat challenge
export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

    const { user, error } = await requireRole(["curator"]);
    if (error) return error;

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Format data tidak valid." },
        { status: 400 }
      );
    }

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
      typeof title !== "string" ||
      typeof description !== "string" ||
      typeof rules !== "string" ||
      typeof reward !== "string" ||
      typeof banner_url !== "string" ||
      !title.trim() ||
      !description.trim() ||
      !rules.trim() ||
      !reward.trim() ||
      !banner_url.trim() ||
      !start_date ||
      !end_date
    ) {
      return NextResponse.json(
        { success: false, message: "Semua data challenge wajib diisi." },
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

    if (!validUrl(banner_url.trim())) {
      return NextResponse.json(
        { success: false, message: "URL banner tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO challenges
        (
          curator_id,
          title,
          description,
          rules,
          reward,
          banner_url,
          start_date,
          end_date
        )
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

    return NextResponse.json(
      {
        success: true,
        message: "Challenge berhasil dibuat.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST CHALLENGE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal membuat challenge." },
      { status: 500 }
    );
  }
}
