-- 1. TABEL USERS
-- Menyimpan data Admin, Member, dan Curator

CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    bio TEXT,
    profile_image TEXT,
    external_link TEXT,
    curator_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check
        CHECK (role IN ('admin', 'member', 'curator')),
    CONSTRAINT users_curator_status_check
        CHECK (
            curator_status IS NULL
            OR curator_status IN ('pending', 'approved', 'rejected')
        ),
    CONSTRAINT users_curator_role_check
        CHECK (
            (role = 'curator' AND curator_status IS NOT NULL)
            OR
            (role IN ('admin', 'member') AND curator_status IS NULL)
        )
);

CREATE UNIQUE INDEX users_username_unique
ON users (LOWER(username));

CREATE UNIQUE INDEX users_email_unique
ON users (LOWER(email));


-- 2. TABEL CATEGORIES
-- Menyimpan kategori karya seni

CREATE TABLE categories (
    category_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);


-- 3. TABEL ARTWORKS
-- Menyimpan karya seni milik Member

CREATE TABLE artworks (
    artwork_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    tags TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT artworks_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT artworks_category_fk
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE RESTRICT,

    CONSTRAINT artworks_status_check
        CHECK (status IN ('published', 'taken_down')),

    CONSTRAINT artworks_id_user_unique
        UNIQUE (artwork_id, user_id)
);


-- 4. TABEL COMMENTS
-- Menyimpan komentar pada karya

CREATE TABLE comments (
    comment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    artwork_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT comments_artwork_fk
        FOREIGN KEY (artwork_id)
        REFERENCES artworks(artwork_id)
        ON DELETE CASCADE,

    CONSTRAINT comments_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT comments_text_check
        CHECK (LENGTH(TRIM(comment_text)) > 0)
);


-- 5. TABEL LIKES
-- Menyimpan karya yang disukai Member

CREATE TABLE likes (
    user_id BIGINT NOT NULL,
    artwork_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, artwork_id),

    CONSTRAINT likes_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT likes_artwork_fk
        FOREIGN KEY (artwork_id)
        REFERENCES artworks(artwork_id)
        ON DELETE CASCADE
);


-- 6. TABEL FAVORITES
-- Menyimpan karya yang masuk ke daftar favorit Member

CREATE TABLE favorites (
    user_id BIGINT NOT NULL,
    artwork_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, artwork_id),

    CONSTRAINT favorites_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT favorites_artwork_fk
        FOREIGN KEY (artwork_id)
        REFERENCES artworks(artwork_id)
        ON DELETE CASCADE
);


-- 7. TABEL REPORTS
-- Menyimpan laporan terhadap karya

CREATE TABLE reports (
    report_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    artwork_id BIGINT NOT NULL,
    reporter_id BIGINT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT reports_artwork_fk
        FOREIGN KEY (artwork_id)
        REFERENCES artworks(artwork_id)
        ON DELETE CASCADE,

    CONSTRAINT reports_reporter_fk
        FOREIGN KEY (reporter_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT reports_status_check
        CHECK (status IN ('pending', 'dismissed', 'taken_down')),

    CONSTRAINT reports_reason_check
        CHECK (LENGTH(TRIM(reason)) > 0),

    CONSTRAINT reports_unique_user_artwork
        UNIQUE (artwork_id, reporter_id)
);


-- 8. TABEL CHALLENGES
-- Menyimpan tantangan yang dibuat Curator

CREATE TABLE challenges (
    challenge_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    curator_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    rules TEXT NOT NULL,
    reward TEXT NOT NULL,
    banner_url TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT challenges_curator_fk
        FOREIGN KEY (curator_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT challenges_date_check
        CHECK (end_date > start_date)
);


-- 9. TABEL CHALLENGE_SUBMISSIONS
-- Menyimpan karya yang dikirim Member ke tantangan

CREATE TABLE challenge_submissions (
    submission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    challenge_id BIGINT NOT NULL,
    artwork_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active',

    CONSTRAINT submissions_challenge_fk
        FOREIGN KEY (challenge_id)
        REFERENCES challenges(challenge_id)
        ON DELETE CASCADE,

    CONSTRAINT submissions_artwork_user_fk
        FOREIGN KEY (artwork_id, user_id)
        REFERENCES artworks(artwork_id, user_id)
        ON DELETE CASCADE,

    CONSTRAINT submissions_status_check
        CHECK (status IN ('active', 'withdrawn')),

    CONSTRAINT submissions_one_work_per_member
        UNIQUE (challenge_id, user_id),

    CONSTRAINT submissions_id_challenge_unique
        UNIQUE (submission_id, challenge_id)
);


-- 10. TABEL CHALLENGE_WINNERS
-- Menyimpan pemenang tantangan berdasarkan peringkat

CREATE TABLE challenge_winners (
    winner_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    challenge_id BIGINT NOT NULL,
    submission_id BIGINT NOT NULL,
    rank INTEGER NOT NULL,
    announced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT winners_submission_challenge_fk
        FOREIGN KEY (submission_id, challenge_id)
        REFERENCES challenge_submissions(submission_id, challenge_id)
        ON DELETE CASCADE,

    CONSTRAINT winners_rank_check
        CHECK (rank BETWEEN 1 AND 3),

    CONSTRAINT winners_unique_rank
        UNIQUE (challenge_id, rank),

    CONSTRAINT winners_unique_submission
        UNIQUE (submission_id)
);


-- =====================================================
-- DATA AWAL KATEGORI
-- =====================================================

INSERT INTO categories (category_name, description)
VALUES
    ('Ilustrasi Digital', 'Karya ilustrasi yang dibuat menggunakan media digital.'),
    ('Fotografi', 'Karya visual yang dihasilkan melalui teknik fotografi.'),
    ('Lukisan', 'Karya seni lukis menggunakan berbagai media dan teknik.'),
    ('Desain Grafis', 'Karya visual yang menggabungkan elemen desain dan komunikasi.'),
    ('Media Campuran', 'Karya yang menggabungkan dua atau lebih media seni.'),
    ('Kolase Digital', 'Karya seni visual yang memadukan berbagai potongan elemen, fotografi, dan tekstur secara digital.');


-- =====================================================
-- INDEX TAMBAHAN UNTUK MEMBANTU PENCARIAN DATA
-- =====================================================

CREATE INDEX artworks_user_id_idx
ON artworks(user_id);

CREATE INDEX artworks_category_id_idx
ON artworks(category_id);

CREATE INDEX comments_artwork_id_idx
ON comments(artwork_id);

CREATE INDEX likes_artwork_id_idx
ON likes(artwork_id);

CREATE INDEX favorites_artwork_id_idx
ON favorites(artwork_id);

CREATE INDEX reports_status_idx
ON reports(status);

CREATE INDEX challenges_curator_id_idx
ON challenges(curator_id);

CREATE INDEX submissions_challenge_id_idx
ON challenge_submissions(challenge_id);

CREATE INDEX winners_challenge_id_idx
ON challenge_winners(challenge_id);


-- Menyesuaikan tabel artworks untuk karya Member, karya Curator, dan karya Kurasi Eksternal

ALTER TABLE artworks
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE artworks
ADD COLUMN source_type VARCHAR(20) NOT NULL DEFAULT 'member',
ADD COLUMN artist_name VARCHAR(150),
ADD COLUMN artwork_year INTEGER,
ADD COLUMN origin_country VARCHAR(100),
ADD COLUMN source_url TEXT,
ADD COLUMN license VARCHAR(150);

-- Memastikan jenis sumber karya sesuai dengan kepemilikannya

ALTER TABLE artworks
ADD CONSTRAINT artworks_source_type_check
CHECK (source_type IN ('member', 'curator', 'curated'));

ALTER TABLE artworks
ADD CONSTRAINT artworks_source_owner_check
CHECK (
    (source_type IN ('member', 'curator') AND user_id IS NOT NULL)
    OR
    (
        source_type = 'curated'
        AND user_id IS NULL
        AND artist_name IS NOT NULL
        AND source_url IS NOT NULL
        AND license IS NOT NULL
    )
);

-- Akun Admin Default
INSERT INTO users (
    username,
    email,
    password_hash,
    role,
    curator_status
)
VALUES (
    'sonder_admin',
    'admin@sonder.com',
    '$2b$10$L4YXJGxGCcHvv2f5JMaGdOjEwbgN.KMMIHsd.wRwXPpFJSnBijRNK',
    'admin',
    NULL
);
