const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.get('/', (req, res) => res.send('Bot de Leitura Cega Ativo'));
app.listen(process.env.PORT || 3000);

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
};

async function leituraCega() {
    try {
        console.log("Iniciando leitura cega...");
        const { data } = await axios.get('https://www.soccerstats.com/matches.asp?matchday=1', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        $('table').each((i, el) => {
            console.log(`--- DADOS DA TABELA ${i} ---`);
            // Lê apenas as 2 primeiras linhas de cada tabela para não poluir o log
            $(el).find('tr').slice(0, 2).each((j, row) => {
                console.log(`Linha ${j}: ${$(row).text().trim().replace(/\s+/g, ' ')}`);
            });
        });
        
        console.log("--- FIM DA LEITURA ---");
    } catch (e) {
        console.error("Erro:", e.message);
    }
}

leituraCega();
