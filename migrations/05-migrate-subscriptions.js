require("dotenv").config();

const mysql = require("../src/config/mysql");
const postgres = require("../src/config/postgres");

const BATCH_SIZE = 1000;

async function migrate() {

    const [countResult] = await mysql.query(
        "SELECT COUNT(*) AS total FROM tbl_subscription"
    );

    const total = countResult[0].total;

    console.log("================================");
    console.log("Dream Images Migration");
    console.log("================================");
    console.log("Total :", total);

    let offset = 0;
    let migrated = 0;

    while (true) {

        const [rows] = await mysql.query(
            `
            SELECT *
FROM tbl_subscription
ORDER BY order_id
LIMIT ?
OFFSET ?`,
            [BATCH_SIZE, offset]
        );
        if (rows.length === 0)
            break; 
offset += rows.length;
migrated += rows.length;        
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
    $${p++},
    $${p++},
    $${p++}
)`);

             params.push(
    row.order_id,
    row.device_id,
    row.package_name,
    row.sku,
    row.time,
    row.available_token,
    row.total_token,
    row.isBlocked,
    row.last_used,
    row.version_code,
    row.deviceId
);

            }

            await client.query(`
                INSERT INTO tbl_subscription(
    order_id,
    device_id,
    package_name,
    sku,
    time,
    available_token,
    total_token,
    "isBlocked",
    last_used,
    version_code,
    "deviceId"
)
                VALUES ${values.join(",")}
                ON CONFLICT(order_id) DO NOTHING
            `, params);

            await client.query("COMMIT");

        } catch (e) {

            await client.query("ROLLBACK");
            throw e;

        } finally {

            client.release();

        }

       
      

        process.stdout.write(`\rMigrated ${migrated}/${total}`);
    }
    console.log("");

  

    // Verify
    const pgResult = await postgres.query(
        "SELECT COUNT(*)::int AS total FROM tbl_subscription"
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
