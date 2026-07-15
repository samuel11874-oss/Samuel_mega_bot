const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();

app.get('/', (req, res) => res.send('Bot Especialista: Extração Ativa'));
app.listen(process.env.PORT || 3000);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' };

async function extrairDados() {
    console.log("🔍 [SISTEMA] Extraindo dados...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        const jogos = [];
        // Seletor padrão para as tabelas de escanteios do WinDrawWin
        $('table.wtt-table tr').each((i, el) => {
            const timeCasa = $(el).find('.wtt-home').text().trim();
            const timeFora = $(el).find('.wtt-away').text().trim();
            const media = $(el).find('.wtt-stats').text().trim();
            
            if (timeCasa && timeFora) {
                jogos.push({ confronto: `${timeCasa} vs ${timeFora}`, media });
            }
        });

        console.log("--- JOGOS ENCONTRADOS ---");
        console.log(jogos.slice(0, 10)); 
    } catch (e) {
        console.error("Erro na extração:", e.message);
    }
}

setInterval(extrairDados, 3600000);
extrairDados();
