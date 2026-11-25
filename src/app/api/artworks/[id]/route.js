import db from "@/lib/db";
import { requireRole, isSameOriginRequest } from "@/lib/get-user";

function isValidImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const trimmed = value.trim();

  if (
    /^\/uploads\/artworks\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(
      trimmed
    )
  ) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export async function GET(request, { params }) {
  try {
    const { error } = await requireRole(["member", "curator"]);
    if (error) return error;

    const { id } = await params;
    const artworkId = Number(id);

    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return Response.json(
        { success: false, message: "ID karya tidak valid." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `SELECT
         a.artwork_id,
         a.user_id,
         a.category_id,
         a.title,
         a.description,
         a.image_url,
         a.tags,
         a.status,
         a.source_type,
         a.artist_name,
         a.artwork_year,
         a.origin_country,
         a.source_url,
         a.license,
         a.created_at,
         c.category_name,
         u.username AS member_username,
         u.username,
         (
           SELECT COUNT(*)::int
           FROM likes l
           WHERE l.artwork_id = a.artwork_id
         ) AS total_likes
       FROM artworks a
       JOIN categories c ON a.category_id = c.category_id
       LEFT JOIN users u ON a.user_id = u.user_id
       WHERE a.artwork_id = $1
         AND a.status = 'published'`,
      [artworkId]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, message: "Karya tidak ditemukan." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("GET ARTWORK DETAIL ERROR:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil detail karya." },
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

    const { user, error } = await requireRole(["member"]);

    if (error) return error;

    const { id } = await params;
    const artworkId = Number(id);

    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return Response.json(
        { success: false, message: "ID karya tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, category_id, tags, image_url } = body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !category_id ||
      !tags?.trim()
    ) {
      return Response.json(
        { success: false, message: "Semua data karya wajib diisi." },
        { status: 400 }
      );
    }

    const parsedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (parsedTags.length === 0) {
      return Response.json(
        { success: false, message: "Minimal 1 tag wajib diisi." },
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

    let nextImageUrl = null;
    if (image_url !== undefined && image_url !== null && String(image_url).trim() !== "") {
      if (!isValidImageUrl(String(image_url))) {
        return Response.json(
          { success: false, message: "File atau URL gambar karya tidak valid." },
          { status: 400 }
        );
      }
      nextImageUrl = String(image_url).trim();
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
      `UPDATE artworks
       SET title = $1,
           description = $2,
           category_id = $3,
           tags = $4,
           image_url = COALESCE($5, image_url)
       WHERE artwork_id = $6
         AND user_id = $7
         AND source_type = 'member'
       RETURNING *`,
      [
        title.trim(),
        description.trim(),
        categoryId,
        parsedTags.join(", "),
        nextImageUrl,
        artworkId,
        user.user_id,
      ]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, message: "Karya tidak ditemukan atau bukan milikmu." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Karya berhasil diperbarui.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Gagal mengedit karya:", error);

    return Response.json(
      { success: false, message: "Gagal memperbarui karya." },
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

  const client = await db.connect();

  try {
    const { user, error } = await requireRole(["member"]);

    if (error) return error;

    const { id } = await params;
    const artworkId = Number(id);

    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return Response.json(
        { success: false, message: "ID karya tidak valid." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const artwork = await client.query(
      `SELECT artwork_id, title
       FROM artworks
       WHERE artwork_id = $1
         AND user_id = $2
         AND source_type = 'member'
       FOR UPDATE`,
      [artworkId, user.user_id]
    );

    if (artwork.rowCount === 0) {
      await client.query("ROLLBACK");

      return Response.json(
        { success: false, message: "Karya tidak ditemukan atau bukan milikmu." },
        { status: 404 }
      );
    }

    const winner = await client.query(
      `SELECT w.winner_id, w.rank, c.title AS challenge_title
       FROM challenge_winners w
       JOIN challenge_submissions s
         ON s.submission_id = w.submission_id
       JOIN challenges c
         ON c.challenge_id = w.challenge_id
       WHERE s.artwork_id = $1`,
      [artworkId]
    );

    if (winner.rowCount > 0) {
      await client.query("ROLLBACK");

      const winInfo = winner.rows[0];
      const artTitle = artwork.rows[0].title;

      return Response.json(
        {
          success: false,
          message: `Karya "${artTitle}" tidak dapat dihapus karena sudah tercatat sebagai pemenang Juara ${winInfo.rank} pada challenge "${winInfo.challenge_title}".`,
        },
        { status: 409 }
      );
    }

    await client.query(
      "DELETE FROM comments WHERE artwork_id = $1",
      [artworkId]
    );

    await client.query(
      "DELETE FROM likes WHERE artwork_id = $1",
      [artworkId]
    );

    await client.query(
      "DELETE FROM favorites WHERE artwork_id = $1",
      [artworkId]
    );

    await client.query(
      "DELETE FROM reports WHERE artwork_id = $1",
      [artworkId]
    );

    await client.query(
      "DELETE FROM challenge_submissions WHERE artwork_id = $1",
      [artworkId]
    );

    await client.query(
      "DELETE FROM artworks WHERE artwork_id = $1",
      [artworkId]
    );

    await client.query("COMMIT");

    return Response.json({
      success: true,
      message: "Karya berhasil dihapus.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Gagal menghapus karya:", error);

    return Response.json(
      { success: false, message: "Gagal menghapus karya." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
