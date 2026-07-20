const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.get('/', (req, res) => res.send('Bot de Debug SoccerStats Ativo'));
app.listen(process.env.PORT || 3000);

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Referer': 'https://www.soccerstats.com/'
};

async function diagnosticar() {
    try {
        console.log("Iniciando Debug profundo no SoccerStats...");
        const { data } = await axios.get('https://www.soccerstats.com/matches.asp?matchday=1', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        console.log("--- ESTRUTURA ENCONTRADA ---");
        
        // Vamos listar todas as tabelas encontradas com seus IDs e Classes
        $('table').each((i, el) => {
            console.log(`Tabela ${i} | ID: ${$(el).attr('id')} | Classe: ${$(el).attr('class')}`);
        });

        // Vamos ver o texto de tudo o que está dentro do "main" ou "content"
        $('body').text().split('\n').forEach(line => {
            if(line.trim().length > 50) { // Logar apenas linhas com texto significativo
                 // console.log("Linha: " + line.trim().substring(0, 100)); 
            }
        });
        
        console.log("--- FIM DO DUMP ---");
        
    } catch (e) {
        console.error("Erro na requisição:", e.message);
    }
}

diagnosticar();
