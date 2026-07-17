const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Bloqueio de Datas'));
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
        
        let podeEnviar = false;

        // Itera sobre todos os elementos que podem ser cabeçalhos ou linhas de jogo
        // Buscamos h3 (títulos de data) e tr (linhas de tabela)
        $('h1, h2, h3, tr').each((i, el) => {
            const texto = $(el).text().trim().toLowerCase();

            // 1. Detecta o cabeçalho "Hoje"
            if (texto.includes('hoje')) {
                podeEnviar = true;
                return;
            }

            // 2. Detecta QUALQUER outra data ou palavra de bloqueio
            // Isso garante que assim que o site mostrar "amanhã" ou outra data, o bot PARA
            if (podeEnviar && (texto.includes('amanhã') || texto.includes('próximos') || /\d{2}\/\d{2}/.test(texto))) {
                podeEnviar = false;
                return;
            }

            // 3. Se estiver na zona de envio ("Hoje"), processa apenas as linhas de jogo (tr)
            if (podeEnviar && $(el).is('tr') && texto.includes(' x ')) {
                const match = texto.match(/([a-zà-ÿ\s]{3,})\sx\s([a-zà-ÿ\s]{3,})/);
                
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

setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 

monitorarJogos();
