import { cookies } from "next/headers";
import { isSameOriginRequest } from "@/lib/get-user";

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { success: false, message: "Request tidak valid." },
      { status: 403 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.delete("sonder_session");

  return Response.json({
    success: true,
    message: "Logout berhasil.",
  });
}
