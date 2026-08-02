require("dotenv").config();

const pool = require("./src/config/database");

async function test() {
    try {
        const result = await pool.query("SELECT NOW()");

        console.log("✅ PostgreSQL Connected");
        console.log(result.rows[0]);

        process.exit(0);
    } catch (err) {
        console.error("❌ Connection Failed");
        console.error(err);
        process.exit(1);
    }
}

test();
