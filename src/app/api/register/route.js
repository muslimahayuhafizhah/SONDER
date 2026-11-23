
import db from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const body = await request.json();

    const { username, email, password, role } = body;

    // Validasi input
    if (!username || !email || !password) {
      return Response.json(
        { message: "Semua data wajib diisi." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { message: "Password minimal 8 karakter." },
        { status: 400 }
      );
    }

    if (!["member", "curator"].includes(role)) {
      return Response.json(
        { message: "Role tidak valid." },
        { status: 400 }
      );
    }

    // Memeriksa email dan username
    const existingUser = await db.query(
      `SELECT user_id FROM users
       WHERE LOWER(email) = LOWER($1)
       OR LOWER(username) = LOWER($2)`,
      [email.trim(), username.trim()]
    );

    if (existingUser.rows.length > 0) {
      return Response.json(
        { message: "Username atau email sudah digunakan." },
        { status: 409 }
      );
    }

    // Mengamankan password
    const passwordHash = await bcrypt.hash(password, 10);

    // Menyimpan pengguna baru
    const curatorStatus =
      role === "curator" ? "pending" : null;

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
    console.error(error);

    return Response.json(
      { message: "Terjadi kesalahan saat registrasi." },
      { status: 500 }
    );
  }
}
