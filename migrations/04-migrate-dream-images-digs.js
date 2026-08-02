require("dotenv").config();

const mysql = require("../src/config/mysql");
const postgres = require("../src/config/postgres");

const BATCH_SIZE = 1000;

async function migrate() {

    const [countResult] = await mysql.query(
        "SELECT COUNT(*) AS total FROM dream_images_digs"
    );

    const total = countResult[0].total;

    console.log("================================");
    console.log("Dream Images Migration");
    console.log("================================");
    console.log("Total :", total);

    let lastId = 0;
    let migrated = 0;

    while (true) {

        const [rows] = await mysql.query(
            `
            SELECT *
            FROM dream_images_digs
            WHERE id > ?
            ORDER BY id
            LIMIT ?
            `,
            [lastId, BATCH_SIZE]
        );

        if (rows.length === 0)
            break;

        const client = await postgres.connect();

        try {

            await client.query("BEGIN");

            let values = [];
            let params = [];
            let p = 1;

            for (const row of rows) {

                values.push(`(
    $${p++},
    $${p++},
    $${p++},
    $${p++},
    $${p++},
    $${p++},
    $${p++},
    $${p++},
    $${p++}
)`);

               params.push(
    row.id,
    row.path,
    row.prompt,
    row.time,
    row.modelName,
    row.stylePreset,
    row.aspectRatio,
    row.country,
    row.approved
);

            }

            await client.query(`
                INSERT INTO dream_images_digs(
    id,
    path,
    prompt,
    time,
    "modelName",
    "stylePreset",
    "aspectRatio",
    country,
    approved
)
                VALUES ${values.join(",")}
                ON CONFLICT(id) DO NOTHING
            `, params);

            await client.query("COMMIT");

        } catch (e) {

            await client.query("ROLLBACK");
            throw e;

        } finally {

            client.release();

        }

        migrated += rows.length;
        lastId = rows[rows.length - 1].id;

        process.stdout.write(`\rMigrated ${migrated}/${total}`);
    }
    console.log("");

    // Update sequence
    await postgres.query(`
        SELECT setval(
            pg_get_serial_sequence('dream_images_digs','id'),
            COALESCE((SELECT MAX(id) FROM dream_images),1),
            true
        );
    `);

    // Verify
    const pgResult = await postgres.query(
        "SELECT COUNT(*)::int AS total FROM dream_images_digs"
    );

    console.log("");
    console.log("================================");
    console.log("Verification");
    console.log("================================");
    console.log("MariaDB    :", total);
    console.log("PostgreSQL :", pgResult.rows[0].total);

    if (total === pgResult.rows[0].total) {
        console.log("✅ Migration Successful");
    } else {
        console.log("❌ Count Mismatch");
    }

    process.exit(0);
}

migrate().catch(err => {
    console.error("");
    console.error("Migration Failed");
    console.error(err);
    process.exit(1);
});
