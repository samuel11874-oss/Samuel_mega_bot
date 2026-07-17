const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Organizado e Bloqueio de Datas'));
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
        
        let podeProcessar = false;

        // Varredura por linhas da tabela
        $('tr').each((i, el) => {
            const linhaTexto = $(el).text().trim().replace(/\s+/g, ' ');
            const textoLower = linhaTexto.toLowerCase();

            // 1. ATIVAÇÃO: Se achar a palavra "Hoje", o bot começa a capturar
            if (textoLower.includes('hoje')) {
                podeProcessar = true;
                return;
            }

            // 2. BLOQUEIO: Se achar qualquer indicativo de outra data, o bot para imediatamente
            if (podeProcessar && (textoLower.includes('amanhã') || /\d{2}\/\d{2}/.test(textoLower))) {
                podeProcessar = false;
                return;
            }

            // 3. CAPTURA: Só processa se estiver dentro do bloco de "Hoje" e for uma linha de jogo
            if (podeProcessar && textoLower.includes(' x ')) {
                const match = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                
                if (match) {
                    const confronto = match[0].trim();

                    if (!jogosEnviados.has(confronto)) {
                        jogosEnviados.add(confronto);

                        // Layout do Card Organizado
                        const mensagem = 
`⚽ *NOVA OPORTUNIDADE*\n` +
`━━━━━━━━━━━━━━━━━━\n` +
`⚔️ *Partida:* ${confronto}\n` +
`📅 *Data:* 17/07/2026\n` +
`━━━━━━━━━━━━━━━━━━\n` +
`🔗 _Verificar estatísticas agora_`;

                        bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                        console.log(`✅ Enviado: ${confronto}`);
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
