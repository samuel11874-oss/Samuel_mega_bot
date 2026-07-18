const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.get('/', (req, res) => res.send('Modo Diagnóstico de Estrutura'));
app.listen(process.env.PORT || 3000);

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

async function diagnosticarLigas() {
    console.log(`🔍 Iniciando varredura diagnóstica...`);
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 25000
        });

        const $ = cheerio.load(response.data);

        // Vamos procurar todos os títulos (headers) que indicam ligas ou seções
        $('h3, .league-name, div').each((i, el) => {
            const texto = $(el).text().trim();
            // Filtra para pegar apenas textos que parecem ser nomes de ligas ou grandes blocos
            if (texto.length > 5 && texto.length < 100 && !texto.includes('Estatísticas') && !texto.includes('cookies')) {
                console.log(`LIGA/SEÇÃO ENCONTRADA: ${texto}`);
            }
        });
    } catch (e) {
        console.error("Erro no diagnóstico:", e.message);
    }
}

diagnosticarLigas();
