DROP TABLE IF EXISTS dose_logs;
DROP TABLE IF EXISTS patient_protocols;
DROP TABLE IF EXISTS protocol_weeks;
DROP TABLE IF EXISTS protocols;
DROP TABLE IF EXISTS medications;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'patient')),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    form TEXT NOT NULL
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
    frequency_per_day INTEGER NOT NULL CHECK (frequency_per_day > 0),
    UNIQUE (protocol_id, week_number, medication_id)
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