const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Filtro de Data Rigoroso'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        
        // Esta variável controla se estamos dentro do bloco de "Hoje"
        let capturandoHoje = false;

        // Selecionamos cabeçalhos (h2/h3) e linhas de tabela (tr)
        // Isso nos permite detectar a mudança de data
        $('h2, h3, tr').each((i, el) => {
            const textoLinha = $(el).text().trim();
            const textoLower = textoLinha.toLowerCase();

            // 1. INÍCIO: Se acharmos o título "Hoje", ativamos a captura
            if (textoLower.includes('hoje')) {
                capturandoHoje = true;
                return; 
            }

            // 2. FIM: Se encontrarmos "Amanhã" ou qualquer data (ex: 18/07), desativamos a captura imediatamente
            if (capturandoHoje && (textoLower.includes('amanhã') || /\d{2}\/\d{2}/.test(textoLower))) {
                capturandoHoje = false;
                return;
            }

            // 3. CAPTURA: Só processamos linhas de jogo (tr) SE estivermos no modo "capturandoHoje"
            if (capturandoHoje && $(el).is('tr') && textoLinha.includes(' x ')) {
                // Regex para capturar o confronto "Time A x Time B"
                const match = textoLinha.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                
                if (match) {
                    const confronto = match[0].trim();

                    if (!jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);

                        const mensagem = `⚽ *JOGO DE HOJE*\n` +
                                         `━━━━━━━━━━━━━━\n` +
                                         `*Partida:* ${confronto}\n` +
                                         `━━━━━━━━━━━━━━`;

                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                        console.log(`✅ Enviado (Hoje): ${confronto}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa o cache diário para permitir reenvio no dia seguinte
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Varredura a cada 5 minutos
setInterval(monitorarJogos, 300000); 

monitorarJogos();
