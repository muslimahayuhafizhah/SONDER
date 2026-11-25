"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Login gagal.");
      }

      if (
        result.data?.role === "curator" &&
        result.data?.curator_status !== "approved"
      ) {
        router.push("/curator/pending");
      } else {
        router.push("/dashboard");
      }

      router.refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E] md:grid md:grid-cols-2">
      {/* Bagian identitas SONDER */}
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#34312E] p-12 text-[#F3EFE7] md:flex lg:p-16">
        <div className="absolute -right-24 top-32 h-80 w-80 rounded-full border border-[#77796B]/50" />
        <div className="absolute -right-12 top-48 h-64 w-64 rounded-full border border-[#77796B]/50" />

        <Link href="/" className="relative z-10 text-3xl font-serif tracking-[0.18em]">
          SONDER<span className="text-[#B87559]">.</span>
        </Link>

        <div className="relative z-10 max-w-lg">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#B87559]">
            A space for creative minds
          </p>

          <h1 className="font-serif text-5xl leading-tight lg:text-6xl">
            Every piece has a story.
          </h1>

          <p className="mt-6 max-w-md text-sm leading-8 text-[#DED4C5]/75">
            Behind every artwork is a perspective waiting to be discovered.
            Come in, explore, and share your own world.
          </p>

          <div className="mt-12 border-l border-[#B87559] pl-5">
            <p className="font-serif text-xl italic text-[#DED4C5]">
              "Art is a way of seeing the world."
            </p>
            <p className="mt-2 text-xs tracking-widest text-[#89847B]">
              THE SONDER JOURNAL
            </p>
          </div>
        </div>

        <p className="relative z-10 text-xs tracking-wider text-[#89847B]">
          © 2026 SONDER. EVERY PIECE HAS A STORY.
        </p>
      </section>

      {/* Form login */}
      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="font-serif text-2xl tracking-[0.15em] md:hidden"
          >
            SONDER<span className="text-[#B87559]">.</span>
          </Link>

          <div className="mb-10 mt-12 md:mt-0">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-[#B87559]">
              Welcome back
            </p>

            <h2 className="font-serif text-4xl">
              Sign in to your world.
            </h2>

            <p className="mt-3 text-sm text-[#89847B]">
              Continue discovering stories through art.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
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
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full border-b border-[#DED4C5] bg-transparent px-1 py-3 text-sm outline-none transition focus:border-[#B87559]"
              />
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
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#89847B]">
            New to SONDER?{" "}
            <Link
              href="/register"
              className="font-medium text-[#B87559] underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>

          <Link
            href="/"
            className="mt-10 block text-center text-xs tracking-wider text-[#89847B] transition hover:text-[#34312E]"
          >
            ← BACK TO HOME
          </Link>
        </div>
      </section>
    </main>
  );
}
