const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.get('/', (req, res) => res.send('Bot Debug: Testando Estrutura'));
app.listen(process.env.PORT || 3000);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' };

async function debugSite(nome, url) {
    try {
        const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        console.log(`--- DEBUG ${nome} ---`);
        console.log("Título da página:", $('title').text().trim());
        console.log("Início do HTML (primeiros 300 caracteres):", $.html().substring(0, 300));
        console.log("----------------------------");
    } catch (e) {
        console.error(`Erro ao acessar ${nome}: ${e.message}`);
    }
}

async function rodarDebug() {
    await debugSite('WinDrawWin', 'https://www.windrawwin.com/br/estatisticas/escanteios/');
    await debugSite('Wincomparator', 'https://www.wincomparator.com/');
    await debugSite('BetExplorer', 'https://www.betexplorer.com/');
}

setInterval(rodarDebug, 3600000);
rodarDebug();
