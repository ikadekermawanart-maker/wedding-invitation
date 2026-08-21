CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_wedding_id_id ON comments (wedding_id,id DESC);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL DEFAULT 'custom',
  event_type_label TEXT NOT NULL DEFAULT 'Invitation',
  event_label TEXT NOT NULL DEFAULT 'You''re Invited',
  event_title TEXT NOT NULL,
  main_name TEXT,
  subtitle TEXT,
  event_date TEXT,
  event_time TEXT,
  location TEXT,
  description TEXT,
  cover_url TEXT,
  gallery_urls TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
