import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { isSameOriginRequest } from "@/lib/get-user";

export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, email, password, role } = body;

    if (!username?.trim() || !email?.trim() || !password) {
      return Response.json(
        { success: false, message: "Semua data wajib diisi." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { success: false, message: "Password minimal 8 karakter." },
        { status: 400 }
      );
    }

    if (!["member", "curator"].includes(role)) {
      return Response.json(
        { success: false, message: "Role tidak valid." },
        { status: 400 }
      );
    }

    const existingUser = await db.query(
      `SELECT user_id FROM users
       WHERE LOWER(email) = LOWER($1)
       OR LOWER(username) = LOWER($2)`,
      [email.trim(), username.trim()]
    );

    if (existingUser.rows.length > 0) {
      return Response.json(
        { success: false, message: "Username atau email sudah digunakan." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const curatorStatus = role === "curator" ? "pending" : null;

    const result = await db.query(
      `INSERT INTO users
       (username, email, password_hash, role, curator_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, username, email, role, curator_status`,
      [
        username.trim(),
        email.trim(),
        passwordHash,
        role,
        curatorStatus,
      ]
    );

    return Response.json(
      {
        success: true,
        message: "Registrasi berhasil.",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return Response.json(
      { success: false, message: "Terjadi kesalahan saat registrasi." },
      { status: 500 }
    );
  }
}
