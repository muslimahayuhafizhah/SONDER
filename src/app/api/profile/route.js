import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  getCurrentUser,
  requireRole,
  isSameOriginRequest,
} from "@/lib/get-user";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    let submissions = [];

    if (user.role === "member") {
      const subRes = await db.query(
        `SELECT
           cs.submission_id,
           cs.challenge_id,
           cs.artwork_id,
           cs.submitted_at,
           cs.status,
           c.title AS challenge_title,
           c.start_date,
           c.end_date,
           a.title AS artwork_title,
           a.image_url AS artwork_image,
           cw.rank AS winner_rank
         FROM challenge_submissions cs
         JOIN challenges c ON c.challenge_id = cs.challenge_id
         JOIN artworks a ON a.artwork_id = cs.artwork_id
         LEFT JOIN challenge_winners cw ON cw.submission_id = cs.submission_id
         WHERE cs.user_id = $1
         ORDER BY cs.submitted_at DESC`,
        [user.user_id]
      );
      submissions = subRes.rows;
    }

    return Response.json({
      success: true,
      data: {
        user,
        submissions,
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);

    return Response.json(
      { success: false, message: "Gagal mengambil data profil." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

    const { user, error } = await requireRole(["member", "curator"]);
    if (error) return error;

    const body = await request.json();
    const {
      username,
      email,
      bio,
      profile_image,
      external_link,
      new_password,
    } = body;

    if (!username?.trim() || !email?.trim()) {
      return Response.json(
        { success: false, message: "Username dan email wajib diisi." },
        { status: 400 }
      );
    }

    if (profile_image?.trim()) {
      try {
        const parsed = new URL(profile_image.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return Response.json(
          { success: false, message: "URL foto profil tidak valid." },
          { status: 400 }
        );
      }
    }

    if (external_link?.trim()) {
      try {
        const parsed = new URL(external_link.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return Response.json(
          {
            success: false,
            message: "Tautan eksternal harus berupa URL http/https yang valid.",
          },
          { status: 400 }
        );
      }
    }

    const duplicate = await db.query(
      `SELECT user_id
       FROM users
       WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2))
         AND user_id <> $3`,
      [username.trim(), email.trim(), user.user_id]
    );

    if (duplicate.rowCount > 0) {
      return Response.json(
        {
          success: false,
          message: "Username atau email sudah digunakan pengguna lain.",
        },
        { status: 409 }
      );
    }

    if (new_password && new_password.length > 0) {
      if (new_password.length < 8) {
        return Response.json(
          { success: false, message: "Password baru minimal 8 karakter." },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(new_password, 10);

      const result = await db.query(
        `UPDATE users
         SET username = $1,
             email = $2,
             bio = $3,
             profile_image = $4,
             external_link = $5,
             password_hash = $6
         WHERE user_id = $7
         RETURNING user_id, username, email, role, bio, profile_image, external_link, curator_status, created_at`,
        [
          username.trim(),
          email.trim(),
          bio?.trim() || null,
          profile_image?.trim() || null,
          external_link?.trim() || null,
          passwordHash,
          user.user_id,
        ]
      );

      return Response.json({
        success: true,
        message: "Profil dan password berhasil diperbarui.",
        data: result.rows[0],
      });
    }

    const result = await db.query(
      `UPDATE users
       SET username = $1,
           email = $2,
           bio = $3,
           profile_image = $4,
           external_link = $5
       WHERE user_id = $6
       RETURNING user_id, username, email, role, bio, profile_image, external_link, curator_status, created_at`,
      [
        username.trim(),
        email.trim(),
        bio?.trim() || null,
        profile_image?.trim() || null,
        external_link?.trim() || null,
        user.user_id,
      ]
    );

    return Response.json({
      success: true,
      message: "Profil berhasil diperbarui.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("PATCH PROFILE ERROR:", error);

    return Response.json(
      { success: false, message: "Gagal memperbarui profil." },
      { status: 500 }
    );
  }
}

// DELETE: Khusus Curator yang berstatus 'rejected' untuk menghapus akunnya melalui halaman Pending Curator
export async function DELETE(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    if (user.role !== "curator" || user.curator_status !== "rejected") {
      return Response.json(
        {
          success: false,
          message:
            "Penghapusan akun melalui halaman ini hanya tersedia untuk pendaftaran Curator yang ditolak.",
        },
        { status: 403 }
      );
    }

    await db.query(
      `DELETE FROM users
       WHERE user_id = $1
         AND role = 'curator'
         AND curator_status = 'rejected'`,
      [user.user_id]
    );

    const cookieStore = await cookies();
    cookieStore.delete("sonder_session");

    return Response.json({
      success: true,
      message: "Akun Curator berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE REJECTED CURATOR ERROR:", error);

    return Response.json(
      { success: false, message: "Gagal menghapus akun." },
      { status: 500 }
    );
  }
}
