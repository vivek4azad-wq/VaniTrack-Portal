-- =======================================================
-- VaniTrack DFCCIL Database Schema for Supabase (PostgreSQL)
-- =======================================================

CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    section TEXT NOT NULL,
    line TEXT,
    km_from NUMERIC(10, 3),
    km_to NUMERIC(10, 3),
    mjb INT DEFAULT 0,
    mib INT DEFAULT 0,
    rub INT DEFAULT 0,
    rob INT DEFAULT 0,
    fob INT DEFAULT 0,
    owg INT DEFAULT 0,
    lc INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bridges (
    id SERIAL PRIMARY KEY,
    bridge_no TEXT NOT NULL,
    old_bridge_no TEXT,
    section TEXT,
    km_from NUMERIC(10, 3),
    km_to NUMERIC(10, 3),
    bridge_type TEXT,
    category TEXT,
    span_config TEXT,
    length NUMERIC(10, 2),
    linear_waterway TEXT,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS curves (
    id SERIAL PRIMARY KEY,
    curve_no TEXT NOT NULL,
    km_from NUMERIC(10, 3),
    km_to NUMERIC(10, 3),
    length NUMERIC(10, 2),
    degree NUMERIC(10, 2),
    radius NUMERIC(10, 2),
    speed NUMERIC(10, 2),
    transition_length NUMERIC(10, 2),
    circular_length NUMERIC(10, 2),
    cant_se NUMERIC(10, 2),
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS points_and_crossings (
    id SERIAL PRIMARY KEY,
    point_no TEXT,
    station TEXT,
    line TEXT,
    angle TEXT,
    rail_section TEXT,
    sleeper_type TEXT,
    srj_chainage NUMERIC(10, 3),
    crossing_chainage NUMERIC(10, 3),
    length NUMERIC(10, 2),
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS master_staff (
    id SERIAL PRIMARY KEY,
    awpo_id TEXT,
    name TEXT,
    designation TEXT,
    mobile TEXT,
    beat_no TEXT,
    duty_type TEXT,
    km_from NUMERIC(10, 3),
    km_to NUMERIC(10, 3),
    route TEXT,
    residence TEXT
);

CREATE TABLE IF NOT EXISTS loop_lines (
    id SERIAL PRIMARY KEY,
    station TEXT,
    line_no TEXT,
    ch_from NUMERIC(10, 3),
    ch_to NUMERIC(10, 3),
    cal NUMERIC(10, 2),
    csr NUMERIC(10, 2),
    status TEXT
);

CREATE TABLE IF NOT EXISTS turnout_defects (
    id SERIAL PRIMARY KEY,
    station TEXT,
    point_no TEXT,
    line TEXT,
    angle TEXT,
    srj_chainage NUMERIC(10, 3),
    wear_nose_center NUMERIC(10, 2),
    remark TEXT
);

CREATE TABLE IF NOT EXISTS dfwo (
    id SERIAL PRIMARY KEY,
    joint_no TEXT,
    chainage NUMERIC(10, 3),
    track TEXT,
    rail TEXT,
    usfd_defect TEXT,
    protection_status TEXT,
    remark TEXT
);

CREATE TABLE IF NOT EXISTS vani_metadata (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
