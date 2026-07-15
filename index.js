const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.get('/', (req, res) => res.send('Bot Debug: Varredura'));
app.listen(process.env.PORT || 3000);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' };

async function varredura() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        console.log("--- INICIANDO VARREDURA ---");
        console.log("Total de tabelas encontradas:", $('table').length);
        console.log("Texto principal da página (500 chars):", $('body').text().substring(0, 500).replace(/\s+/g, ' '));
        console.log("--- FIM DA VARREDURA ---");
    } catch (e) { console.error("Erro na varredura:", e.message); }
}

setInterval(varredura, 3600000);
varredura();
