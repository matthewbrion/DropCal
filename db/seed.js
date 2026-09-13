import db from '#db/client';
import bcrypt from 'bcrypt';
import { createUser } from '#db/queries/users';

async function seed() {
    try {
        await db.query(`TRUNCATE users, medications, protocols, protocol_weeks, patient_protocols RESTART IDENTITY CASCADE`);
        const hash = await bcrypt.hash('password123', 10);
        const doctor = await createUser('Dr. Marcus Hayes', 'hayes@example.com', hash, 'doctor');
        const patient = await createUser('Eleanor Vance', 'vance@example.com', hash, 'patient');
        const patient2 = await createUser('David Chen', 'chen@example.com', hash, 'patient');
        
        
        const { rows: [pred] } = await db.query(
            `INSERT INTO medications
            (name, form)
        VALUES
            ($1, $2)
        RETURNING id`,
            ['Prednisolone Acetate 1%', 'Eye drop']
        );
        const { rows: [moxi] } = await db.query(
            `INSERT INTO medications
            (name, form)
        VALUES
            ($1, $2)
        RETURNING id`,
            ['Moxifloxacin 0.5%', 'Eye drop']
        );
        const { rows: [protocol] } = await db.query(
            `INSERT INTO protocols
            (name, procedure)
        VALUES
            ($1, $2)
        RETURNING id`,
            ['Post-Cataract Taper', 'Cataract surgery']
        );
        const { rows: [ulcerProtocol] } = await db.query(
            `INSERT INTO protocols
                (name, procedure)
            VALUES
                ($1, $2)
            RETURNING id`,
            ['Corneal Ulcer Taper', 'Corneal Ulcer Treatment']
        );

        const cataractWeeks = [
            { week_number: 1, medication_id: pred.id, eye: 'both', frequency_per_day: 4 },
            { week_number: 1, medication_id: moxi.id, eye: 'both', frequency_per_day: 4 },
            { week_number: 2, medication_id: pred.id, eye: 'both', frequency_per_day: 3 },
            { week_number: 3, medication_id: pred.id, eye: 'both', frequency_per_day: 2 },
            { week_number: 4, medication_id: pred.id, eye: 'both', frequency_per_day: 1 },
        ];

        const ulcerWeeks = [
            { week_number: 1, medication_id: moxi.id, eye: 'left', frequency_per_day: 6 },
            { week_number: 1, medication_id: moxi.id, eye: 'right', frequency_per_day: 4 },
            { week_number: 2, medication_id: moxi.id, eye: 'left', frequency_per_day: 4 },
            { week_number: 2, medication_id: moxi.id, eye: 'right', frequency_per_day: 2 },
        ];

        for (const w of cataractWeeks) {
            await db.query(`INSERT INTO protocol_weeks
            (protocol_id, week_number, medication_id, eye, frequency_per_day)
        VALUES
            ($1, $2, $3, $4, $5)`,
                [protocol.id, w.week_number, w.medication_id, w.eye, w.frequency_per_day]
            );
        }

        for (const w of ulcerWeeks) {
            await db.query(`INSERT INTO protocol_weeks
                (protocol_id, week_number, medication_id, eye, frequency_per_day)
            VALUES
                ($1, $2, $3, $4, $5)`,
                [ulcerProtocol.id, w.week_number, w.medication_id, w.eye, w.frequency_per_day]
            );
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 16);

        await db.query(
            `INSERT INTO patient_protocols
            (patient_id, doctor_id, protocol_id, start_date)
        VALUES
            ($1, $2, $3, $4)`,
            [patient.id, doctor.id, protocol.id, startDate.toISOString().slice(0, 10)]
        );

        const ulcerStartDate = new Date();
        ulcerStartDate.setDate(ulcerStartDate.getDate() - 9);

        await db.query(
            `INSERT INTO patient_protocols
            (patient_id, doctor_id, protocol_id, start_date)
        VALUES
            ($1, $2, $3, $4)`,
            [patient2.id, doctor.id, ulcerProtocol.id, ulcerStartDate.toISOString().slice(0, 10)]
        );

        console.log("🌱 Database seeded.");
    } catch (err) {
        console.error('Seed failed:', err.message);
        throw err;
    } finally {
        await db.end();
    }
}

await db.connect();
await seed();