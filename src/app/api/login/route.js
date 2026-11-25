import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/get-user";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { success: false, message: "Request tidak valid." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email?.trim() || !password) {
      return Response.json(
        { success: false, message: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const result = await db.query(
      `SELECT * FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { success: false, message: "Email atau password salah." },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return Response.json(
        { success: false, message: "Email atau password salah." },
        { status: 401 }
      );
    }

    const token = await createSession(user);
    const cookieStore = await cookies();

    cookieStore.set("sonder_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return Response.json({
      success: true,
      message: "Login berhasil.",
      data: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        curator_status: user.curator_status,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return Response.json(
      { success: false, message: "Terjadi kesalahan saat login." },
      { status: 500 }
    );
  }
}
