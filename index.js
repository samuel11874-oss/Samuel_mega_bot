const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.get('/', (req, res) => res.send('Bot Investigador 2.0 Ativo'));
app.listen(process.env.PORT || 3000);

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': 'https://www.google.com/'
};

async function investigarJogos() {
    console.log("--------------------------------------------------");
    console.log("[INVESTIGADOR 2.0] Varrendo todos os elementos...");

    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(data);
        let contador = 0;

        // Agora vasculhamos TUDO (tr, div, li, span)
        $('tr, div, li, span').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Se a linha tiver pelo menos 20 caracteres e contiver números de escanteios (formato XX.X)
            if (linha.length > 20 && /\d{1,2}\.\d/.test(linha) && contador < 15) {
                console.log(`[LINHA ENCONTRADA]: ${linha.substring(0, 80)}...`);
                contador++;
            }
        });

        if (contador === 0) console.log("ALERTA: Nenhuma linha com números foi encontrada em nenhuma tag.");
        console.log(`[FIM] Verifique acima o formato dos dados.`);
        
    } catch (e) {
        console.error("Erro na leitura:", e.message);
    }
}

setInterval(investigarJogos, 1200000); 
investigarJogos();
