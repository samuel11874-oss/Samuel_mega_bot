const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.get('/', (req, res) => res.send('Bot de Diagnóstico Raio-X'));
app.listen(process.env.PORT || 3000);

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        console.log("--- RAIO-X DO SITE (Texto completo) ---");
        // Imprime os primeiros 3000 caracteres do texto da página
        console.log($('body').text().substring(0, 3000));
        console.log("--- FIM DO RAIO-X ---");

    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(monitorarJogos, 300000); 
monitorarJogos();
