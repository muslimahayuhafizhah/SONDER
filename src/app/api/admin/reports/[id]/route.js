
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
  let transactionStarted = false;

  try {
    const { id } = await params;
    const reportId = Number(id);

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return Response.json(
        { success: false, message: "ID laporan tidak valid." },
        { status: 400 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, message: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const { status } = body;

    if (!["dismissed", "taken_down"].includes(status)) {
      return Response.json(
        { success: false, message: "Status laporan tidak valid." },
        { status: 400 }
      );
    }

    client = await db.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    const report = await client.query(
      `SELECT report_id, artwork_id, status
       FROM reports
       WHERE report_id = $1
       FOR UPDATE`,
      [reportId]
    );

    if (report.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return Response.json(
        { success: false, message: "Laporan tidak ditemukan." },
        { status: 404 }
      );
    }

    if (report.rows[0].status !== "pending") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return Response.json(
        { success: false, message: "Laporan ini sudah diproses." },
        { status: 409 }
      );
    }

    const artworkId = report.rows[0].artwork_id;

    if (status === "taken_down") {
      const artwork = await client.query(
        `UPDATE artworks
         SET status = 'taken_down'
         WHERE artwork_id = $1
         RETURNING artwork_id`,
        [artworkId]
      );

      if (artwork.rowCount === 0) {
        throw new Error("Karya tidak ditemukan.");
      }

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
    transactionStarted = false;

    return Response.json({
      success: true,
      message:
        status === "dismissed"
          ? "Laporan berhasil ditolak."
          : "Karya berhasil diturunkan dari galeri.",
    });
  } catch (error) {
    if (transactionStarted && client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("ROLLBACK REPORT ERROR:", rollbackError);
      }
    }

    console.error("PATCH ADMIN REPORT ERROR:", error);

    return Response.json(
      { success: false, message: "Gagal memproses laporan." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
