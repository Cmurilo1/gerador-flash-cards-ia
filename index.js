
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const db = require('./db'); // ✅ Caminho correto

const app = express();

// ✅ CORS configurado para funcionar local e na Vercel
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://gerador-flash-cards-ia-oe22-beb89hwom-cmurilo1s-projects.vercel.app"
  ]
}));

app.use(express.json());

// ✅ Servir arquivos da pasta PUBLIC
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Rota para Gerar e Salvar os Flashcards
app.post('/api/flashcards/gerar', async (req, res) => {
  try {
    const { id_usuario, materia, texto_estudo } = req.body;

    if (!texto_estudo || !id_usuario) {
      return res.status(400).json({ error: "Faltam dados obrigatórios." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    const urlAPI = 'https://api.groq.com/openai/v1/chat/completions';

    const dataBody = {
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Analise o texto e responda APENAS em formato JSON válido, contendo uma lista de objetos. Mesmo que haja apenas um flashcard, retorne dentro de colchetes. Exemplo: [{ "pergunta": "...", "resposta": "..." }]. Texto: ${texto_estudo}`
      }],
      temperature: 0.2
    };

    const responseAI = await axios.post(urlAPI, dataBody, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let text = responseAI.data.choices[0].message.content;
    const textClean = text.replace(/`json|```/g, "").trim();

    let parsedData;
    try {
      parsedData = JSON.parse(textClean);
    } catch (e) {
      console.error("Erro ao fazer parse do JSON:", e);
      return res.status(500).json({ error: "Erro na formatação da resposta da IA" });
    }

    const flashcardsGerados = Array.isArray(parsedData) ? parsedData : [parsedData];

    console.log("Iniciando inserção de", flashcardsGerados.length, "flashcards.");

    for (const card of flashcardsGerados) {
      if (!card.pergunta || !card.resposta) {
        console.error("Flashcard inválido encontrado:", card);
        continue;
      }
      try {
        await db.execute(
          'INSERT INTO tabela_flashcards (id_usuario, materia, pergunta, resposta) VALUES (?, ?, ?, ?)',
          [id_usuario, materia || 'Geral', card.pergunta, card.resposta]
        );
      } catch (dbError) {
        console.error("Erro CRÍTICO no banco:", dbError);
        throw dbError;
      }
    }

    res.status(201).json({ 
      message: 'Flashcards salvos com sucesso com a Groq!', 
      cards: flashcardsGerados 
    });

  } catch (error) {
    console.error("Erro no processamento:", error?.response?.data || error.message);
    res.status(500).json({ 
      error: "Erro no processamento", 
      detalhes: error?.response?.data || error.message 
    });
  }
});

// ✅ Rota para buscar flashcards
app.get('/api/flashcards/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const [linhas] = await db.execute(
      'SELECT * FROM tabela_flashcards WHERE id_usuario = ?',
      [id_usuario]
    );

    res.status(200).json(linhas);
  } catch (error) {
    console.error("Erro ao buscar flashcards:", error);
    res.status(500).json({ error: "Erro ao buscar os dados no banco." });
  }
});

// ✅ Rota para deletar flashcard
app.delete('/api/flashcards/:id_card', async (req, res) => {
  const { id_card } = req.params;

  try {
    const [resultado] = await db.execute(
      'DELETE FROM tabela_flashcards WHERE id_card = ?',
      [id_card]
    );
  
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Flashcard não encontrado." });
    }
    res.status(200).json({ message: `Flashcard ${id_card} deletado com sucesso!` });
  } catch (error) {
    console.error("Erro ao deletar flashcard:", error);
    res.status(500).json({ error: "Erro ao tentar deletar o cartão no banco." });
  }
});

// ✅ Iniciar servidor
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => console.log(`Servidor rodando na porta ${PORTA}`));