
import db from "@/lib/db";
import { requireRole } from "@/lib/get-user";

export async function PATCH(request, { params }) {
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

    const body = await request.json();
    const { title, description, category_id, tags } = body;

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

    const categoryId = Number(category_id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return Response.json(
        { success: false, message: "Kategori tidak valid." },
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
      `UPDATE artworks
       SET title = $1,
           description = $2,
           category_id = $3,
           tags = $4
       WHERE artwork_id = $5
         AND user_id = $6
         AND source_type = 'member'
       RETURNING *`,
      [
        title.trim(),
        description.trim(),
        categoryId,
        tags.trim(),
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
      `SELECT artwork_id
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
      `SELECT w.winner_id
       FROM challenge_winners w
       JOIN challenge_submissions s
         ON s.submission_id = w.submission_id
       WHERE s.artwork_id = $1`,
      [artworkId]
    );

    if (winner.rowCount > 0) {
      await client.query("ROLLBACK");

      return Response.json(
        {
          success: false,
          message: "Karya yang sudah menjadi pemenang challenge tidak dapat dihapus.",
        },
        { status: 409 }
      );
    }

    // Hapus data yang bergantung pada karya terlebih dahulu
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
