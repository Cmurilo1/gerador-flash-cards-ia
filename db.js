const mysql = require('mysql2');
require('dotenv').config();

// Configura o grupo de conexões com o MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // Coloque sua senha do banco se tiver
    database: process.env.DB_NAME || 'app_flashcards',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Transforma em Promises para usarmos async/await
const db = pool.promise();

module.exports = db;