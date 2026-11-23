
import db from "@/lib/db";
import {
  requireRole,
  isSameOriginRequest,
} from "@/lib/get-user";

export async function PATCH(request, { params }) {
  const { error } = await requireRole(["admin"]);

  if (error) return error;

  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, message: "Permintaan tidak valid." },
      { status: 403 }
    );
  }

  let client;

  try {
    const { id } = await params;
    const reportId = Number(id);

    if (!Number.isInteger(reportId) || reportId < 1) {
      return Response.json(
        { success: false, message: "ID laporan tidak valid." },
        { status: 400 }
      );
    }

    const { status } = await request.json();

    if (!["dismissed", "taken_down"].includes(status)) {
      return Response.json(
        { success: false, message: "Status laporan tidak valid." },
        { status: 400 }
      );
    }

    client = await db.connect();

    await client.query("BEGIN");

    const report = await client.query(
      `SELECT report_id, artwork_id, status
       FROM reports
       WHERE report_id = $1
       FOR UPDATE`,
      [reportId]
    );

    if (report.rowCount === 0) {
      await client.query("ROLLBACK");

      return Response.json(
        { success: false, message: "Laporan tidak ditemukan." },
        { status: 404 }
      );
    }

    if (report.rows[0].status !== "pending") {
      await client.query("ROLLBACK");

      return Response.json(
        { success: false, message: "Laporan ini sudah diproses." },
        { status: 409 }
      );
    }

    const artworkId = report.rows[0].artwork_id;

    if (status === "taken_down") {
      await client.query(
        `UPDATE artworks
         SET status = 'taken_down'
         WHERE artwork_id = $1`,
        [artworkId]
      );

      await client.query(
        `UPDATE reports
         SET status = 'taken_down'
         WHERE artwork_id = $1
           AND status = 'pending'`,
        [artworkId]
      );
    } else {
      await client.query(
        `UPDATE reports
         SET status = 'dismissed'
         WHERE report_id = $1`,
        [reportId]
      );
    }

    await client.query("COMMIT");

    return Response.json({
      success: true,
      message:
        status === "dismissed"
          ? "Laporan berhasil ditolak."
          : "Karya berhasil diturunkan dari galeri.",
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error(error);

    return Response.json(
      { success: false, message: "Gagal memproses laporan." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
