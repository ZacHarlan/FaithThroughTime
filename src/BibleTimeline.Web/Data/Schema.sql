-- Bible Timeline Database Schema
-- All years are integers: negative = BCE, positive = CE

CREATE TABLE IF NOT EXISTS people (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    alt_names       TEXT,                    -- comma-separated alternate names
    birth_year      INTEGER,                 -- negative for BCE
    death_year      INTEGER,
    birth_approx    INTEGER NOT NULL DEFAULT 1,  -- 1 = approximate
    death_approx    INTEGER NOT NULL DEFAULT 1,
    date_confidence TEXT    NOT NULL DEFAULT 'traditional'
                    CHECK (date_confidence IN ('certain','probable','possible','traditional')),
    role            TEXT,                     -- patriarch, king, prophet, apostle, judge, priest, other
    significance    TEXT    NOT NULL DEFAULT 'minor'
                    CHECK (significance IN ('major','moderate','minor')),
    tribe           TEXT,
    father_id       INTEGER REFERENCES people(id) ON DELETE SET NULL,
    mother_id       INTEGER REFERENCES people(id) ON DELETE SET NULL,
    description     TEXT,
    date_notes      TEXT                     -- explain disputed chronology
);

CREATE TABLE IF NOT EXISTS events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    start_year      INTEGER,
    end_year        INTEGER,
    start_approx    INTEGER NOT NULL DEFAULT 1,
    end_approx      INTEGER NOT NULL DEFAULT 1,
    date_confidence TEXT    NOT NULL DEFAULT 'traditional'
                    CHECK (date_confidence IN ('certain','probable','possible','traditional')),
    category        TEXT,                     -- creation, covenant, war, miracle, prophecy, exile, birth, death, law, conquest, judgment, salvation
    significance    TEXT    NOT NULL DEFAULT 'minor'
                    CHECK (significance IN ('major','moderate','minor')),
    description     TEXT,
    date_notes      TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS time_periods (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    start_year  INTEGER NOT NULL,
    end_year    INTEGER NOT NULL,
    color       TEXT,                         -- hex color for timeline band
    sort_order  INTEGER NOT NULL DEFAULT 0,
    description TEXT
);

CREATE TABLE IF NOT EXISTS biblical_books (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    name                 TEXT NOT NULL,
    abbreviation         TEXT,
    testament            TEXT CHECK (testament IN ('OT','NT')),
    genre                TEXT, -- law, history, wisdom, prophecy, gospel, epistle, apocalyptic
    approx_writing_year  INTEGER,
    period_covered_start INTEGER,
    period_covered_end   INTEGER
);

CREATE TABLE IF NOT EXISTS scripture_references (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id         INTEGER REFERENCES biblical_books(id),
    chapter_start   INTEGER,
    verse_start     INTEGER,
    chapter_end     INTEGER,
    verse_end       INTEGER,
    reference_text  TEXT NOT NULL  -- e.g. "Genesis 12:1-3"
);

CREATE TABLE IF NOT EXISTS locations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    modern_name TEXT,
    latitude    REAL,
    longitude   REAL,
    region      TEXT,
    description TEXT
);

-- Junction tables

CREATE TABLE IF NOT EXISTS person_events (
    person_id     INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    role_in_event TEXT,
    PRIMARY KEY (person_id, event_id)
);

CREATE TABLE IF NOT EXISTS person_scripture (
    person_id    INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    scripture_id INTEGER NOT NULL REFERENCES scripture_references(id) ON DELETE CASCADE,
    context      TEXT,
    PRIMARY KEY (person_id, scripture_id)
);

CREATE TABLE IF NOT EXISTS event_scripture (
    event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    scripture_id INTEGER NOT NULL REFERENCES scripture_references(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, scripture_id)
);

CREATE TABLE IF NOT EXISTS person_relationships (
    person_id_1       INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    person_id_2       INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    relationship_type TEXT    NOT NULL, -- parent, child, spouse, sibling, mentor, successor, contemporary
    PRIMARY KEY (person_id_1, person_id_2, relationship_type)
);

CREATE TABLE IF NOT EXISTS event_locations (
    event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, location_id)
);

CREATE TABLE IF NOT EXISTS journeys (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    book_id     INTEGER REFERENCES biblical_books(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS journey_stops (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    journey_id  INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    event_id    INTEGER REFERENCES events(id) ON DELETE SET NULL,
    label       TEXT NOT NULL,
    description TEXT,
    year        INTEGER,
    chapter     TEXT          -- e.g. "Acts 2" for reference
);

-- Indexes for common queries

CREATE INDEX IF NOT EXISTS idx_people_role ON people(role);
CREATE INDEX IF NOT EXISTS idx_people_significance ON people(significance);
CREATE INDEX IF NOT EXISTS idx_people_years ON people(birth_year, death_year);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_significance ON events(significance);
CREATE INDEX IF NOT EXISTS idx_events_years ON events(start_year, end_year);
CREATE INDEX IF NOT EXISTS idx_time_periods_years ON time_periods(start_year, end_year);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);

-- Full-text search virtual tables
CREATE VIRTUAL TABLE IF NOT EXISTS people_fts USING fts5(name, alt_names, description, content='people', content_rowid='id');
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(name, description, content='events', content_rowid='id');

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS people_ai AFTER INSERT ON people BEGIN
    INSERT INTO people_fts(rowid, name, alt_names, description) VALUES (new.id, new.name, new.alt_names, new.description);
END;
CREATE TRIGGER IF NOT EXISTS people_ad AFTER DELETE ON people BEGIN
    INSERT INTO people_fts(people_fts, rowid, name, alt_names, description) VALUES('delete', old.id, old.name, old.alt_names, old.description);
END;
CREATE TRIGGER IF NOT EXISTS people_au AFTER UPDATE ON people BEGIN
    INSERT INTO people_fts(people_fts, rowid, name, alt_names, description) VALUES('delete', old.id, old.name, old.alt_names, old.description);
    INSERT INTO people_fts(rowid, name, alt_names, description) VALUES (new.id, new.name, new.alt_names, new.description);
END;

CREATE TRIGGER IF NOT EXISTS events_ai AFTER INSERT ON events BEGIN
    INSERT INTO events_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
END;
CREATE TRIGGER IF NOT EXISTS events_ad AFTER DELETE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description);
END;
CREATE TRIGGER IF NOT EXISTS events_au AFTER UPDATE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description);
    INSERT INTO events_fts(rowid, name, description) VALUES (new.id, new.name, new.description);
END;
