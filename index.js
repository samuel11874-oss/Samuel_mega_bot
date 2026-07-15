const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.get('/', (req, res) => res.send('Bot Debug: Mapeamento Final'));
app.listen(process.env.PORT || 3000);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

async function mapearSite(nome, url) {
    try {
        const { data } = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);
        
        console.log(`\n--- MAPEANDO ${nome} ---`);
        
        // Buscamos elementos que costumam conter times (divs, spans, links)
        $('div, a, span, td').each((i, el) => {
            const texto = $(el).text().trim();
            // Filtro para achar onde está o "Time x Time"
            if (texto.includes(' x ') && texto.length < 50) {
                const classe = $(el).attr('class');
                if (classe) {
                    console.log(`Classe encontrada: .${classe.split(' ')[0]} | Conteúdo: ${texto}`);
                }
            }
        });
        
        console.log(`--- FIM DO MAPEAMENTO: ${nome} ---\n`);
    } catch (e) { console.error(`Erro em ${nome}: ${e.message}`); }
}

async function rodarMapeamento() {
    await mapearSite('Wincomparator', 'https://www.wincomparator.com/');
    await mapearSite('BetExplorer', 'https://www.betexplorer.com/');
}

rodarMapeamento();
