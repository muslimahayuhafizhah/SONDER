
const artworks = [
  {
    number: "001",
    title: "The Quiet Between",
    artist: "Studio Arunika",
    category: "Ilustrasi Digital",
  },
  {
    number: "002",
    title: "Fragments of Home",
    artist: "Nadia Putri",
    category: "Fotografi",
  },
  {
    number: "003",
    title: "A Different Perspective",
    artist: "Raka Aditya",
    category: "Lukisan",
  },
];

const categories = [
  "Ilustrasi Digital",
  "Fotografi",
  "Lukisan",
  "Desain Grafis",
  "Media Campuran",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F3EFE7] text-[#34312E]">
      {/* NAVIGASI */}
      <nav className="flex items-center justify-between border-b border-[#DED4C5] px-6 py-5 md:px-12">
        <a href="/" className="font-serif text-2xl tracking-[0.18em]">
          SONDER<span className="text-[#B87559]">.</span>
        </a>

        <div className="hidden items-center gap-9 text-sm md:flex">
          <a href="#explore" className="hover:text-[#B87559]">
            Jelajahi
          </a>
          <a href="#categories" className="hover:text-[#B87559]">
            Kategori
          </a>
          <a href="#challenges" className="hover:text-[#B87559]">
            Tantangan
          </a>
          <a href="#about" className="hover:text-[#B87559]">
            Tentang
          </a>
        </div>

        <a
          href="/login"
          className="border border-[#34312E] px-5 py-2 text-sm transition hover:bg-[#34312E] hover:text-[#F3EFE7]"
        >
          Masuk
        </a>
      </nav>

      {/* BAGIAN PEMBUKA */}
      <section className="grid gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:px-12 md:py-24">
        <div>
          <p className="mb-6 text-xs tracking-[0.25em] text-[#77796B]">
            RUANG TERBUKA UNTUK PARA KREATOR
          </p>

          <h1 className="max-w-xl font-serif text-5xl leading-[1.12] md:text-7xl">
            Every piece
            <br />
            has a <span className="italic text-[#B87559]">story.</span>
          </h1>

          <p className="mt-7 max-w-md text-sm leading-7 text-[#77796B] md:text-base">
            Setiap kreator memiliki dunia dan perspektifnya sendiri.
            Temukan cerita, sudut pandang, dan emosi yang tersimpan
            di balik setiap karya seni.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            <a
              href="#explore"
              className="bg-[#34312E] px-7 py-3 text-sm text-[#F3EFE7] transition hover:bg-[#77796B]"
            >
              Jelajahi Karya
            </a>

            <a
              href="#about"
              className="text-sm underline underline-offset-4"
            >
              Tentang SONDER
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="aspect-[4/5] bg-[#DED4C5]">
            <div className="flex h-full items-center justify-center">
              <p className="font-serif text-2xl italic text-[#77796B]">
                A world within a frame.
              </p>
            </div>
          </div>

          <p className="mt-4 text-right text-[10px] tracking-[0.2em] text-[#77796B]">
            KOLEKSI SONDER · NO. 001
          </p>
        </div>
      </section>

      {/* KARYA PILIHAN */}
      <section id="explore" className="px-6 py-16 md:px-12 md:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs tracking-[0.2em] text-[#B87559]">
              01 — PILIHAN KARYA
            </p>
            <h2 className="font-serif text-4xl md:text-5xl">
              Karya Pilihan
            </h2>
          </div>

          <a
            href="/explore"
            className="text-sm underline underline-offset-4"
          >
            Lihat Semua Karya →
          </a>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {artworks.map((artwork) => (
            <article key={artwork.number} className="group">
              <div className="flex aspect-[4/5] items-center justify-center bg-[#DED4C5] transition group-hover:bg-[#D3C5B2]">
                <span className="font-serif text-2xl italic text-[#77796B]">
                  Karya {artwork.number}
                </span>
              </div>

              <div className="mt-4 flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-xl">
                    {artwork.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#77796B]">
                    {artwork.artist}
                  </p>
                  <p className="mt-2 text-xs text-[#B87559]">
                    {artwork.category}
                  </p>
                </div>

                <span className="text-xs text-[#77796B]">
                  {artwork.number}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* KATEGORI */}
      <section
        id="categories"
        className="bg-[#DED4C5] px-6 py-16 md:px-12 md:py-24"
      >
        <p className="mb-3 text-xs tracking-[0.2em] text-[#B87559]">
          02 — TEMUKAN MINATMU
        </p>

        <h2 className="mb-10 font-serif text-4xl md:text-5xl">
          Jelajahi Kategori
        </h2>

        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => (
            <a
              href="/explore"
              key={category}
              className="flex items-center justify-between border-b border-[#B9AD9D] py-6 transition hover:px-3"
            >
              <span className="font-serif text-xl">{category}</span>
              <span className="text-sm text-[#77796B]">
                0{index + 1} ↗
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* SOROTAN KREATOR */}
      <section className="grid gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:px-12 md:py-24">
        <div className="flex aspect-[4/3] items-center justify-center bg-[#77796B]">
          <p className="font-serif text-2xl italic text-[#F3EFE7]">
            Di balik setiap karya,
            <br />
            ada seorang kreator.
          </p>
        </div>

        <div>
          <p className="mb-4 text-xs tracking-[0.2em] text-[#B87559]">
            03 — PARA KREATOR
          </p>

          <h2 className="font-serif text-4xl leading-tight md:text-5xl">
            Kenali Sosok di Balik Karya.
          </h2>

          <p className="mt-6 max-w-md text-sm leading-7 text-[#77796B]">
            Temukan para kreator, kenali sudut pandang mereka,
            dan apresiasi cerita yang ingin mereka bagikan.
          </p>

          <a
            href="/creators"
            className="mt-8 inline-block border-b border-[#34312E] pb-2 text-sm"
          >
            Kenali Para Kreator →
          </a>
        </div>
      </section>

      {/* TANTANGAN */}
      <section
        id="challenges"
        className="bg-[#34312E] px-6 py-20 text-[#F3EFE7] md:px-12 md:py-28"
      >
        <p className="mb-5 text-xs tracking-[0.2em] text-[#DED4C5]">
          04 — RUANG BERKARYA
        </p>

        <h2 className="max-w-2xl font-serif text-4xl leading-tight md:text-6xl">
          Setiap Karya Pantas Mendapat Ruang.
        </h2>

        <p className="mt-6 max-w-lg text-sm leading-7 text-[#DED4C5]">
          Ikuti tantangan kreatif, bagikan karyamu, dan
          jadikan ceritamu bagian dari perjalanan yang lebih besar.
        </p>

        <a
          href="/challenges"
          className="mt-9 inline-block bg-[#B87559] px-7 py-3 text-sm transition hover:bg-[#A3654B]"
        >
          Jelajahi Tantangan →
        </a>
      </section>

      {/* TENTANG SONDER */}
      <section id="about" className="px-6 py-16 text-center md:px-12 md:py-24">
        <p className="mb-5 text-xs tracking-[0.2em] text-[#B87559]">
          TENTANG SONDER
        </p>

        <h2 className="mx-auto max-w-3xl font-serif text-3xl leading-relaxed md:text-5xl">
          Setiap orang memiliki kisah yang sama luasnya dengan dunia.
        </h2>

        <p className="mx-auto mt-7 max-w-xl text-sm leading-7 text-[#77796B]">
          SONDER merayakan keindahan berbagai perspektif melalui
          seni, kreativitas, dan hubungan antarmanusia.
        </p>
      </section>

      {/* KAKI HALAMAN */}
      <footer className="border-t border-[#DED4C5] px-6 py-10 md:px-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="font-serif text-3xl tracking-[0.18em]">
              SONDER.
            </h2>
            <p className="mt-2 text-sm text-[#77796B]">
              Setiap karya memiliki cerita.
            </p>
          </div>

          <div className="text-sm text-[#77796B] md:text-right">
            <p>Ruang bagi setiap perspektif kreatif.</p>
            <p className="mt-2">
              © 2026 SONDER. Hak cipta dilindungi.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
