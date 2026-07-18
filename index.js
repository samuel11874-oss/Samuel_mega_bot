const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em modo de busca ampla'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function buscarJogos() {
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: MOBILE_HEADERS });
        const $ = cheerio.load(response.data);
        
        console.log("--- Iniciando Varredura Ampla ---");

        // BUSCA POR QUALQUER ELEMENTO QUE TENHA TEXTO DE JOGO
        // Não vamos filtrar por tabela ou data, apenas pegar tudo que parece jogo
        // para sabermos se o bot consegue "enxergar" o conteúdo
        let encontrados = 0;

        $('body *').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Só olhamos elementos que tenham " x " e um número de canto
            if (texto.includes(' x ') && (texto.includes('10.') || texto.includes('11.') || texto.includes('12.'))) {
                // Apenas elementos que não tenham filhos (para evitar duplicação)
                if ($(el).children().length === 0) {
                    encontrados++;
                    console.log(`Linha detectada (${encontrados}): ${texto}`);
                    
                    // Se encontrar, envia para o Telegram
                    bot.sendMessage(CHAT_ID, `🔍 *Linha detectada:* ${texto}`, { parse_mode: 'Markdown' }).catch(console.error);
                }
            }
        });

        console.log(`Varredura concluída. Total de elementos encontrados: ${encontrados}`);

    } catch (e) {
        console.error("Erro:", e.message);
    }
}

setInterval(buscarJogos, 300000);
buscarJogos();
