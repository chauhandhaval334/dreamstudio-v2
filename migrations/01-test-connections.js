require("dotenv").config();

const mysql = require("../src/config/mysql");
const postgres = require("../src/config/postgres");

async function testConnections() {
    try {
        console.log("🔄 Testing MariaDB...");

        const [mysqlRows] = await mysql.query("SELECT NOW() AS now");

        console.log("✅ MariaDB Connected");
        console.log(mysqlRows[0]);

        console.log("");

        console.log("🔄 Testing PostgreSQL...");

        const pgResult = await postgres.query("SELECT NOW()");

        console.log("✅ PostgreSQL Connected");
        console.log(pgResult.rows[0]);

        process.exit(0);

    } catch (err) {
        console.error("");
        console.error("❌ Connection Error");
        console.error(err);

        process.exit(1);
    }
}

testConnections();
