
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getChallenges() {
      try {
        const response = await fetch("/api/challenges", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal mengambil data challenge.");
        }

        setChallenges(result.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    getChallenges();
  }, []);

  function getChallengeStatus(startDate, endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (today < start) return "Segera Dibuka";
    if (today > end) return "Selesai";
    return "Sedang Berlangsung";
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      <nav className="flex items-center justify-between border-b border-[#DED4C5] px-6 py-5 md:px-12">
        <Link
          href="/"
          className="font-serif text-2xl font-semibold tracking-wide"
        >
          SONDER
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-[#B87559]">
            Home
          </Link>
          <Link href="/explore" className="hover:text-[#B87559]">
            Explore
          </Link>
          <Link
            href="/challenges"
            className="border-b border-[#B87559] pb-1 text-[#B87559]"
          >
            Challenges
          </Link>
          <Link href="/login" className="hover:text-[#B87559]">
            Sign In
          </Link>
        </div>
      </nav>

      <section className="px-6 pb-16 pt-20 md:px-12 md:pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#B87559]">
            Explore & Create
          </p>

          <div className="grid gap-8 md:grid-cols-2 md:items-end">
            <h1 className="font-serif text-5xl leading-tight md:text-7xl">
              Setiap karya punya kesempatan untuk bersinar.
            </h1>

            <p className="max-w-lg text-sm leading-7 text-[#77796B] md:justify-self-end">
              Temukan challenge kreatif, tuangkan ide, dan bagikan
              perspektif unikmu melalui sebuah karya.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between border-b border-[#DED4C5] pb-4">
            <h2 className="font-serif text-2xl">Daftar Challenge</h2>
            <span className="text-xs text-[#77796B]">
              {challenges.length} challenge
            </span>
          </div>

          {loading ? (
            <p className="py-16 text-center text-sm text-[#77796B]">
              Memuat challenge...
            </p>
          ) : error ? (
            <p className="py-16 text-center text-sm text-red-700">
              {error}
            </p>
          ) : challenges.length === 0 ? (
            <div className="py-20 text-center">
              <h3 className="font-serif text-2xl">
                Belum ada challenge
              </h3>
              <p className="mt-3 text-sm text-[#77796B]">
                Challenge baru akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {challenges.map((challenge) => {
                const status = getChallengeStatus(
                  challenge.start_date,
                  challenge.end_date
                );

                return (
                  <Link
                    key={challenge.challenge_id}
                    href={`/challenges/${challenge.challenge_id}`}
                    className="group block"
                  >
                    <div className="overflow-hidden bg-[#DED4C5]">
                      {challenge.banner_url ? (
                        <img
                          src={challenge.banner_url}
                          alt={challenge.title}
                          className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-64 items-center justify-center bg-[#77796B] font-serif text-3xl text-[#F3EFE7]">
                          SONDER
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 py-4">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#B87559]">
                        {status}
                      </span>
                      <span className="text-xs text-[#77796B]">
                        {formatDate(challenge.end_date)}
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl transition group-hover:text-[#B87559]">
                      {challenge.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#77796B]">
                      {challenge.description}
                    </p>

                    <p className="mt-5 text-xs uppercase tracking-widest">
                      Lihat Detail →
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-[#DED4C5] px-6 py-8 text-center text-xs text-[#77796B]">
        SONDER — Every Piece Has a Story.
      </footer>
    </main>
  );
}
