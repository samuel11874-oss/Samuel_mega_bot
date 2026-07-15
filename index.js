const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.get('/', (req, res) => res.send('Bot Debug: Inspeção Tríplice'));
app.listen(process.env.PORT || 3000);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' };

async function inspecionarSite(nome, url) {
    try {
        const { data } = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);
        
        console.log(`\n--- INSPEÇÃO: ${nome} ---`);
        // Procura divs que contenham nomes de times (geralmente possuem "x" ou "-" entre nomes)
        $('div, a, span').each((i, el) => {
            const texto = $(el).text().trim();
            if (texto.includes(' x ') || texto.includes(' vs ')) {
                // Filtramos apenas resultados que parecem confrontos reais
                if (texto.length < 60) { 
                    console.log(`Classe: ${$(el).attr('class')} | Conteúdo: ${texto}`);
                }
            }
        });
        console.log(`--- FIM DA INSPEÇÃO: ${nome} ---\n`);
    } catch (e) { console.error(`Erro em ${nome}:`, e.message); }
}

async function rodarDebug() {
    await inspecionarSite('Wincomparator', 'https://www.wincomparator.com/');
    await inspecionarSite('BetExplorer', 'https://www.betexplorer.com/');
}

rodarDebug();
