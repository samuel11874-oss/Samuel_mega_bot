const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Modo Investigador Ativo'));
app.listen(process.env.PORT || 3000);

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': 'https://www.google.com/'
};

async function investigarJogos() {
    console.log("--------------------------------------------------");
    console.log("[INVESTIGADOR] Lendo estrutura da página...");

    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(data);
        
        // Vamos imprimir as primeiras 10 linhas que contenham números
        // Isso vai nos revelar o formato real dos dados
        let contador = 0;
        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            if (/\d{1,2}\.\d/.test(linha) && contador < 10) {
                console.log(`[LINHA ENCONTRADA]: ${linha}`);
                contador++;
            }
        });

        console.log(`[FIM] Verifique acima o formato dos dados.`);
        
    } catch (e) {
        console.error("Erro na leitura:", e.message);
    }
}

setInterval(investigarJogos, 1200000); 
investigarJogos();
