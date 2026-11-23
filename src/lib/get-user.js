
import { cookies } from "next/headers";
import db from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sonder_session")?.value;

  if (!token) return null;

  const session = await verifySession(token);

  if (!session || !session.user_id) return null;

  const result = await db.query(
    `SELECT
       user_id,
       username,
       email,
       role,
       curator_status
     FROM users
     WHERE user_id = $1`,
    [session.user_id]
  );

  return result.rows[0] || null;
}

export async function requireRole(allowedRoles) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      error: Response.json(
        {
          success: false,
          message: "Silakan login terlebih dahulu.",
        },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      user: null,
      error: Response.json(
        {
          success: false,
          message: "Kamu tidak memiliki akses ke fitur ini.",
        },
        { status: 403 }
      ),
    };
  }

  if (
    user.role === "curator" &&
    user.curator_status !== "approved"
  ) {
    return {
      user: null,
      error: Response.json(
        {
          success: false,
          message: "Akun Curator belum mendapatkan persetujuan Admin.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    error: null,
  };
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) return false;

  try {
    const originHost = new URL(origin).host.toLowerCase();

    return originHost === host.toLowerCase();
  } catch {
    return false;
  }
}
