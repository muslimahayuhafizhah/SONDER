
import { SignJWT, jwtVerify } from "jose";

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET harus diisi minimal 32 karakter."
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(user) {
  const token = await new SignJWT({
    user_id: user.user_id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  return token;
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    return payload;
  } catch {
    return null;
  }
}
