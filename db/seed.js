import db from '#db/client';
import bcrypt from 'bcrypt';
import { createUser } from '#db/queries/users';

async function seedDoseLogs(patientProtocolId, protocolId, startDate, totalWeeks) {
    const { rows: weeks } = await db.query(
        `SELECT id, week_number, frequency_per_day
        FROM protocol_weeks
        WHERE protocol_id = $1`,
        [protocolId]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = [];

    for (let dayOffset = 0; dayOffset < totalWeeks * 7; dayOffset++) {
        const day = new Date(startDate);
        day.setDate(day.getDate() + dayOffset);

        if (day >= today) {
            break; //leave today unlogged so doses can be logged in a demo
        }

        if (dayOffset === 11) {
            continue; //one day missed completely
        }

        const shortDay = dayOffset % 9 === 4; //every ninth day is one dose short
        const weekNumber = Math.floor(dayOffset / 7) + 1;
        const logDate = day.toISOString().slice(0, 10);

        for (const week of weeks) {
            if (week.week_number !== weekNumber) {
                continue;
            }

            let doses = week.frequency_per_day;
            if (shortDay) {
                doses = doses - 1;
            }

            for (let doseIndex = 1; doseIndex <= doses; doseIndex++) {
                const hour = String(7 + doseIndex * 2).padStart(2, '0');
                logs.push([patientProtocolId, week.id, logDate, doseIndex, `${logDate} ${hour}:00:00`]);
            }
        }
    }

    if (logs.length === 0) {
        return;
    }

    //one insert for the whole course instead of one per dose
    const placeholders = [];
    const params = [];
    for (const log of logs) {
        const n = params.length;
        placeholders.push(`($${n + 1}, $${n + 2}, $${n + 3}, $${n + 4}, $${n + 5})`);
        params.push(...log);
    }

    await db.query(
        `INSERT INTO dose_logs
        (patient_protocol_id, protocol_week_id, log_date, dose_index, checked_at)
    VALUES
        ${placeholders.join(',\n        ')}`,
        params
    );
}

//cap colours as published by the AAO, plus the plain words a patient would use.
//a null cap colour means the class has no coloured cap: ointments, tablets, single use vials.
async function seedDrugClasses() {
    const classes = [
        ['corticosteroid', 'Steroid', 'pink', 'white'],
        ['corticosteroid_strong', 'Steroid', 'pink', null],
        ['fluoroquinolone', 'Antibiotic', 'tan', null],
        ['aminoglycoside_steroid', 'Antibiotic and steroid', 'pink', 'white'],
        ['polymyxin_combination', 'Antibiotic', null, null],
        ['macrolide', 'Antibiotic', null, null],
        ['prostaglandin_analog', 'Eye pressure', 'teal_green', null],
        ['beta_blocker', 'Eye pressure', 'yellow', null],
        ['alpha_agonist', 'Eye pressure', 'purple', null],
        ['carbonic_anhydrase_inhibitor', 'Eye pressure', 'orange', null],
        ['cai_beta_blocker', 'Eye pressure', 'white', 'dark_blue'],
        ['alpha_beta_combination', 'Eye pressure', 'dark_blue', null],
        ['cai_alpha_agonist', 'Eye pressure', null, null],
        ['rho_kinase_inhibitor', 'Eye pressure', 'white', null],
        ['mydriatic_cycloplegic', 'Dilating drop', 'red', null],
        ['topical_anesthetic', 'Numbing drop', 'white', null],
        ['nsaid', 'Anti-inflammatory', null, null],
        ['antihistamine', 'Allergy drop', null, null],
        ['lubricant', 'Lubricant', null, null],
        ['supplement', 'Supplement', null, null],
    ];

    const ids = {};
    for (const [name, label, cap, accent] of classes) {
        const { rows: [row] } = await db.query(
            `INSERT INTO drug_classes
            (name, patient_label, cap_color, cap_color_accent)
        VALUES
            ($1, $2, $3, $4)
        RETURNING id`,
            [name, label, cap, accent]
        );
        ids[name] = row.id;
    }
    return ids;
}

//real medications and strengths, taken from an ophthalmology prescribing list
async function seedMedications(classIds) {
    const medications = [
        ['Prednisolone Acetate', '1%', 'Pred Forte', 'drop', 'corticosteroid'],
        ['Moxifloxacin', '0.5%', 'Vigamox', 'drop', 'fluoroquinolone'],
        ['Ofloxacin', '0.3%', 'Ocuflox', 'drop', 'fluoroquinolone'],
        ['Tobramycin-Dexamethasone', '0.3%-0.1%', 'TobraDex', 'drop', 'aminoglycoside_steroid'],
        ['Polymyxin B-Trimethoprim', '10,000 units-1 mg/mL', 'Polytrim', 'drop', 'polymyxin_combination'],
        ['Erythromycin', '0.5%', null, 'ointment', 'macrolide'],
        ['Latanoprost', '0.005%', 'Xalatan', 'drop', 'prostaglandin_analog'],
        ['Timolol Maleate', '0.5%', 'Timoptic', 'drop', 'beta_blocker'],
        ['Timolol Maleate Gel', '0.5%', 'Timoptic-XE', 'drop', 'beta_blocker'],
        ['Brimonidine', '0.2%', 'Alphagan', 'drop', 'alpha_agonist'],
        ['Dorzolamide', '2%', 'Trusopt', 'drop', 'carbonic_anhydrase_inhibitor'],
        ['Dorzolamide-Timolol', '2%-0.5%', 'Cosopt', 'drop', 'cai_beta_blocker'],
        ['Brinzolamide-Brimonidine', '1%-0.2%', 'Simbrinza', 'drop', 'cai_alpha_agonist'],
        ['Diclofenac', '0.1%', null, 'drop', 'nsaid'],
        ['Ketotifen', '0.025%', 'Zaditor', 'drop', 'antihistamine'],
        ['Ocular Lubricant', null, null, 'drop', 'lubricant'],
        ['Ocular Multivitamin', null, null, 'tablet', 'supplement'],
    ];

    const ids = {};
    for (const [name, strength, brand, form, className] of medications) {
        const { rows: [row] } = await db.query(
            `INSERT INTO medications
            (name, strength, brand_name, form, drug_class_id)
        VALUES
            ($1, $2, $3, $4, $5)
        RETURNING id`,
            [name, strength, brand, form, classIds[className]]
        );
        ids[name.toLowerCase()] = row.id;
    }
    return ids;
}

async function seed() {
    try {
        await db.query(`TRUNCATE users, drug_classes, medications, protocols, protocol_weeks, patient_protocols RESTART IDENTITY CASCADE`);
        const hash = await bcrypt.hash('password123', 10);
        const timezone = 'America/Detroit';
        const doctor = await createUser('Dr. Marcus Hayes', 'hayes@example.com', hash, 'doctor', timezone);
        const patient = await createUser('Eleanor Vance', 'vance@example.com', hash, 'patient', timezone);
        const patient2 = await createUser('David Chen', 'chen@example.com', hash, 'patient', timezone);
        
        const classIds = await seedDrugClasses();
        const medIds = await seedMedications(classIds);
        const pred = { id: medIds['prednisolone acetate'] };
        const moxi = { id: medIds['moxifloxacin'] };
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

        const { rows: [vanceCataract] } = await db.query(
            `INSERT INTO patient_protocols
            (patient_id, doctor_id, protocol_id, start_date)
        VALUES
            ($1, $2, $3, $4)
            RETURNING id`,
            [patient.id, doctor.id, protocol.id, startDate.toISOString().slice(0, 10)]
        );

        const ulcerStartDate = new Date();
        ulcerStartDate.setDate(ulcerStartDate.getDate() - 9);

        const { rows: [chenUlcer] } = await db.query(
            `INSERT INTO patient_protocols
            (patient_id, doctor_id, protocol_id, start_date)
        VALUES
            ($1, $2, $3, $4)
            RETURNING id`,
            [patient2.id, doctor.id, ulcerProtocol.id, ulcerStartDate.toISOString().slice(0, 10)]
        );

                const vanceUlcerStart = new Date();
        vanceUlcerStart.setDate(vanceUlcerStart.getDate() - 70);

        const { rows: [vanceUlcer] } = await db.query(
            `INSERT INTO patient_protocols
            (patient_id, doctor_id, protocol_id, start_date)
        VALUES
            ($1, $2, $3, $4)
        RETURNING id`,
            [patient.id, doctor.id, ulcerProtocol.id, vanceUlcerStart.toISOString().slice(0, 10)]
        );

        await seedDoseLogs(vanceUlcer.id, ulcerProtocol.id, vanceUlcerStart, 2);
        await seedDoseLogs(vanceCataract.id, protocol.id, startDate, 4);

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