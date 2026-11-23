
import db from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/get-user";

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        a.artwork_id,
        a.title,
        a.description,
        a.image_url,
        a.tags,
        a.source_type,
        a.artist_name,
        a.artwork_year,
        a.origin_country,
        a.source_url,
        a.license,
        a.created_at,
        c.category_name,
        u.username AS member_username
      FROM artworks a
      JOIN categories c
        ON a.category_id = c.category_id
      LEFT JOIN users u
        ON a.user_id = u.user_id
      WHERE a.status = 'published'
      ORDER BY a.created_at DESC
    `);

    return Response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Gagal mengambil karya:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil data karya." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { user, error } = await requireRole(["member"]);

    if (error) return error;

    const body = await request.json();
    const { title, description, category_id, image_url, tags } = body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !category_id ||
      !image_url?.trim() ||
      !tags?.trim()
    ) {
      return Response.json(
        { success: false, message: "Semua data karya wajib diisi." },
        { status: 400 }
      );
    }

    const categoryId = Number(category_id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return Response.json(
        { success: false, message: "Kategori tidak valid." },
        { status: 400 }
      );
    }

    try {
      new URL(image_url);
    } catch {
      return Response.json(
        { success: false, message: "URL gambar tidak valid." },
        { status: 400 }
      );
    }

    const category = await db.query(
      "SELECT category_id FROM categories WHERE category_id = $1",
      [categoryId]
    );

    if (category.rowCount === 0) {
      return Response.json(
        { success: false, message: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    const result = await db.query(
      `INSERT INTO artworks
        (user_id, category_id, title, description, image_url, tags, source_type)
       VALUES ($1, $2, $3, $4, $5, $6, 'member')
       RETURNING *`,
      [
        user.user_id,
        categoryId,
        title.trim(),
        description.trim(),
        image_url.trim(),
        tags.trim(),
      ]
    );

    return Response.json(
      {
        success: true,
        message: "Karya berhasil ditambahkan.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Gagal menambahkan karya:", error);

    return Response.json(
      { success: false, message: "Gagal menambahkan karya." },
      { status: 500 }
    );
  }
}
