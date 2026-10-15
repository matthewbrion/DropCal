DROP TABLE IF EXISTS dose_logs;
DROP TABLE IF EXISTS patient_protocols;
DROP TABLE IF EXISTS protocol_weeks;
DROP TABLE IF EXISTS protocols;
DROP TABLE IF EXISTS medications;
DROP TABLE IF EXISTS drug_classes;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'patient')),
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- cap colours follow the drug class, per the AAO's colour coding of eye drop caps.
-- some classes have no cap colour at all: ointments, tablets and single use vials.
CREATE TABLE drug_classes (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    patient_label TEXT NOT NULL,
    cap_color TEXT CHECK (cap_color IN ('pink', 'red', 'white', 'yellow', 'purple', 'orange', 'teal_green', 'dark_blue', 'tan')),
    cap_color_accent TEXT CHECK (cap_color_accent IN ('pink', 'red', 'white', 'yellow', 'purple', 'orange', 'teal_green', 'dark_blue', 'tan'))
);

CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    strength TEXT,
    brand_name TEXT,
    form TEXT NOT NULL CHECK (form IN ('drop', 'ointment', 'tablet')),
    drug_class_id INTEGER REFERENCES drug_classes(id)
);

CREATE TABLE protocols (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    procedure TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE protocol_weeks (
    id SERIAL PRIMARY KEY,
    protocol_id INTEGER NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number > 0),
    medication_id INTEGER NOT NULL REFERENCES medications(id),
    eye TEXT NOT NULL CHECK (eye IN ('left', 'right', 'both')),
    frequency_per_day INTEGER NOT NULL CHECK (frequency_per_day > 0),
    UNIQUE (protocol_id, week_number, medication_id, eye)
);

CREATE TABLE patient_protocols (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    doctor_id INTEGER NOT NULL REFERENCES users(id),
    protocol_id INTEGER NOT NULL REFERENCES protocols(id),
    start_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE dose_logs (
    id SERIAL PRIMARY KEY,
    patient_protocol_id INTEGER NOT NULL REFERENCES patient_protocols(id) ON DELETE CASCADE,
    protocol_week_id INTEGER NOT NULL REFERENCES protocol_weeks(id),
    log_date DATE NOT NULL,
    dose_index INTEGER NOT NULL CHECK (dose_index > 0),
    checked_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (patient_protocol_id, log_date, protocol_week_id, dose_index)
);