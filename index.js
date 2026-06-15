
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));
// Adicione esta rota para forçar o envio do index.html na raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Rota para Gerar e Salvar os Flashcards
app.post('/api/flashcards/gerar', async (req, res) => {
    try {
        const { id_usuario, materia, texto_estudo } = req.body;

        if (!texto_estudo || !id_usuario) {
            return res.status(400).json({ error: "Faltam dados obrigatórios." });
        }

        const apiKey = process.env.GROQ_API_KEY;
        const urlAPI = 'https://api.groq.com/openai/v1/chat/completions';

        const dataBody = {
            model: "llama-3.3-70b-versatile", // Modelo ultra rápido e gratuito
            messages: [{
                role: "user",
                content: `content: Você é especialista em materiais de estudo e provas de vestibular. Com base no texto abaixo — que pode vir de foto de página, prova ou resumo — identifique TODAS as perguntas e suas respostas correspondentes. Separe em uma lista de flashcards claros, em formato JSON.
Texto: ${texto_estudo}`
            }],
            temperature: 0.2
        };

        // Requisição HTTP direta para a Groq
        const responseAI = await axios.post(urlAPI, dataBody, {
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // Captura o texto limpo da IA
        const text = responseAI.data.choices[0].message.content;

        // Converte o texto recebido para array JSON real
        const flashcardsGerados = JSON.parse(text.trim());

        // Inserção automática no seu Banco de Dados MySQL
        for (const card of flashcardsGerados) {
            await db.execute(
                'INSERT INTO tabela_flashcards (id_usuario, materia, pergunta, resposta) VALUES (?, ?, ?, ?)',
                [id_usuario, materia, card.pergunta, card.resposta]
            );
        }

        // Retorna a resposta de sucesso para o Postman
        res.status(201).json({ message: 'Flashcards salvos com sucesso com a Groq!', cards: flashcardsGerados });

    } catch (error) {
        console.error("Erro no processamento:", error?.response?.data || error.message);
        res.status(500).json({ 
            error: "Erro no processamento", 
            detalhes: error?.response?.data || error.message 
        });
    }
});
// Rota para buscar todos os flashcards de um usuário
app.get('/api/flashcards/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;

    try {
        // Busca os flashcards do usuário direto no MySQL
        const [linhas] = await db.execute(
            'SELECT * FROM tabela_flashcards WHERE id_usuario = ?',
            [id_usuario]
        );

        // Se encontrar, devolve a lista para a tela
        res.status(200).json(linhas);
    } catch (error) {
        console.error("Erro ao buscar flashcards:", error);
        res.status(500).json({ error: "Erro ao buscar os dados no banco." });
    }
});
// Rota para deletar um flashcard específico pelo ID dele
app.delete('/api/flashcards/:id_card', async (req, res) => {
    const { id_card } = req.params;

    try {
        // Executa o comando para apagar o cartão do banco de dados
        const [resultado] = await db.execute(
            'DELETE FROM tabela_flashcards WHERE id_card = ?',
            [id_card]
        );

        // Se nenhum registro foi afetado, significa que esse ID não existia
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: "Flashcard não encontrado." });
        }

        // Se deu certo, avisa o usuário
        res.status(200).json({ message: `Flashcard ${id_card} deletado com sucesso!` });
    } catch (error) {
        console.error("Erro ao deletar flashcard:", error);
        res.status(500).json({ error: "Erro ao tentar deletar o cartão no banco." });
    }
});


module.exports = app;