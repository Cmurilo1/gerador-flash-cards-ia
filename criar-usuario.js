require('dotenv').config();
const db = require('./db');

async function criar() {
    try {
        // Comando para colocar o Usuário 1 de verdade no seu banco
        await db.execute(
            'INSERT INTO tabelausuarios (id_usuario, nome, email) VALUES (1, "Claudio Murilo", "claudio@teste.com")'
        );
        console.log("✅ SUCESSO: Usuário 1 criado com orgulho no banco de dados!");
    } catch (error) {
        console.error("❌ Erro ao criar usuário:", error.message);
    } {
        process.exit();
    }
}

criar();