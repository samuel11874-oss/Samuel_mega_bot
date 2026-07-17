const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Filtro Rígido de Datas'));
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

        // Buscamos todas as linhas (tr) e cabeçalhos (th) da tabela
        $('tr, th').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');

            // 1. Detecta o início da seção "Hoje"
            if (linha.toLowerCase().includes('hoje')) {
                podeEnviar = true;
                return; // Pula a linha do título "Hoje"
            }

            // 2. Detecta se mudou de data (Amanhã, ou qualquer data como 18/07)
            // Se encontrar outra data, o bot para de enviar imediatamente
            if (podeEnviar && (linha.toLowerCase().includes('amanhã') || /\d{1,2}\/\d{1,2}/.test(linha))) {
                podeEnviar = false;
                return;
            }

            // 3. Se estiver na zona de envio, busca apenas jogos com " x "
            if (podeEnviar && linha.includes(' x ')) {
                const match = linha.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                
                if (match) {
                    const confronto = match[0].trim();

                    if (!jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);

                        const mensagem = `⚽ *JOGO DE HOJE*\n` +
                                         `━━━━━━━━━━━━━━\n` +
                                         `*Partida:* ${confronto}\n` +
                                         `━━━━━━━━━━━━━━`;

                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                        console.log(`✅ Enviado com sucesso: ${confronto}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Limpa o cache diário
setInterval(() => { jogosEnviados.clear(); }, 86400000); 

// Varredura a cada 5 minutos
setInterval(monitorarJogos, 300000); 

monitorarJogos();
