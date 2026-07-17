const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico Ativo'));
app.listen(process.env.PORT || 3000);

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function inspecionarSite() {
    try {
        console.log("--- INICIANDO INSPEÇÃO TOTAL ---");
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        // Pega todo o texto da página e corta nos primeiros 2000 caracteres
        const textoCompleto = response.data.substring(0, 2000);
        console.log("--- CONTEÚDO DA PÁGINA (Resumo) ---");
        console.log(textoCompleto);
        console.log("--- FIM DA INSPEÇÃO ---");
        
    } catch (e) {
        console.error("Erro na inspeção:", e.message);
    }
}

setInterval(inspecionarSite, 600000); 
inspecionarSite();
