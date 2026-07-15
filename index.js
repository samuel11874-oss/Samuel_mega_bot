const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.get('/', (req, res) => res.send('Bot Debug: Inspecionando Estrutura'));
app.listen(process.env.PORT || 3000);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' };

async function inspecionarEstrutura() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        console.log("--- INICIANDO INSPEÇÃO DE TABELA ---");
        
        $('table').first().find('tr').slice(0, 10).each((i, el) => {
            const classes = $(el).attr('class');
            const texto = $(el).text().trim().substring(0, 100);
            console.log(`Linha ${i} | Classe: ${classes} | Conteúdo: ${texto}`);
        });
        
        console.log("--- FIM DA INSPEÇÃO ---");
    } catch (e) { console.error("Erro na inspeção:", e.message); }
}

setInterval(inspecionarEstrutura, 3600000);
inspecionarEstrutura();
