const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "127.0.0.1",
     host: "localhost",
 user: "dream_studio_admin",
 password: "Wfu19031903@", 
database: "dream_studio", 
waitForConnections: true, 
connectionLimit: 5,
    });

module.exports = pool;
