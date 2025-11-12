
CREATE TABLE IF NOT EXISTS amrg_chunks (
  key_path   TEXT PRIMARY KEY,
  data       BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  root_doc_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS amrg_chunks_key_path_like_idx
  ON amrg_chunks (key_path text_pattern_ops);

