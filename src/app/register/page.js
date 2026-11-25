
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registrasi gagal.");
      }

      setSuccess(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E] md:grid md:grid-cols-2">
      {/* Bagian identitas SONDER */}
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#77796B] p-12 text-[#F3EFE7] md:flex lg:p-16">
        <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full border border-[#DED4C5]/30" />
        <div className="absolute -bottom-12 -left-8 h-72 w-72 rounded-full border border-[#DED4C5]/30" />

        <Link href="/" className="relative z-10 text-3xl font-serif tracking-[0.18em]">
          SONDER<span className="text-[#DED4C5]">.</span>
        </Link>

        <div className="relative z-10 max-w-lg">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#DED4C5]">
            Your story begins here
          </p>

          <h1 className="font-serif text-5xl leading-tight lg:text-6xl">
            Create. Share. Discover.
          </h1>

          <p className="mt-6 max-w-md text-sm leading-8 text-[#F3EFE7]/80">
            A creative space where different perspectives meet,
            artworks find their audience, and every story matters.
          </p>
        </div>

        <p className="relative z-10 text-xs tracking-wider text-[#DED4C5]">
          © 2026 SONDER. EVERY PIECE HAS A STORY.
        </p>
      </section>

      {/* Form register */}
      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="font-serif text-2xl tracking-[0.15em] md:hidden"
          >
            SONDER<span className="text-[#B87559]">.</span>
          </Link>

          {success ? (
            <div className="mt-16">
              <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[#B87559]">
                Registration complete
              </p>

              <h2 className="font-serif text-4xl">
                Welcome to SONDER.
              </h2>

              <p className="mt-5 text-sm leading-7 text-[#89847B]">
                {role === "curator"
                  ? "Your Curator registration has been submitted. Please wait for Admin approval before accessing Curator features."
                  : "Your account has been created. You can now sign in and start exploring SONDER."}
              </p>

              <Link
                href="/login"
                className="mt-8 block w-full bg-[#34312E] py-4 text-center text-sm tracking-widest text-[#F3EFE7] transition hover:bg-[#77796B]"
              >
                GO TO SIGN IN
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 mt-12 md:mt-0">
                <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#B87559]">
                  Join the community
                </p>

                <h2 className="font-serif text-4xl">
                  Begin your story.
                </h2>

                <p className="mt-3 text-sm text-[#89847B]">
                  Create an account and find your place in SONDER.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Choose a username"
                    autoComplete="username"
                    required
                    className="w-full border-b border-[#DED4C5] bg-transparent px-1 py-3 text-sm outline-none transition focus:border-[#B87559]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full border-b border-[#DED4C5] bg-transparent px-1 py-3 text-sm outline-none transition focus:border-[#B87559]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="w-full border-b border-[#DED4C5] bg-transparent px-1 py-3 text-sm outline-none transition focus:border-[#B87559]"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium">
                    I want to join as
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("member")}
                      className={`border px-4 py-3 text-sm transition ${
                        role === "member"
                          ? "border-[#34312E] bg-[#34312E] text-[#F3EFE7]"
                          : "border-[#DED4C5] hover:border-[#B87559]"
                      }`}
                    >
                      Member
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("curator")}
                      className={`border px-4 py-3 text-sm transition ${
                        role === "curator"
                          ? "border-[#34312E] bg-[#34312E] text-[#F3EFE7]"
                          : "border-[#DED4C5] hover:border-[#B87559]"
                      }`}
                    >
                      Curator
                    </button>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-[#89847B]">
                    Curator accounts require Admin approval before
                    Curator features can be accessed.
                  </p>
                </div>

                {error && (
                  <p className="border-l-2 border-[#B87559] bg-[#B87559]/10 px-4 py-3 text-sm text-[#8B4935]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#34312E] py-4 text-sm tracking-widest text-[#F3EFE7] transition hover:bg-[#77796B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-[#89847B]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-[#B87559] underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
