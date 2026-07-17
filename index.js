const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Estrutural'));
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
        
        // Lógica de Tabela: Procuramos cada tabela da página
        $('table').each((i, table) => {
            const conteudoTabela = $(table).text().toLowerCase();

            // Só processamos a tabela se ela contiver a palavra "hoje"
            if (conteudoTabela.includes('hoje')) {
                
                // Dentro dessa tabela, pegamos apenas as linhas (tr)
                $(table).find('tr').each((j, row) => {
                    const linhaTexto = $(row).text().trim().replace(/\s+/g, ' ');

                    // Se a linha tiver um confronto " x "
                    if (linhaTexto.includes(' x ')) {
                        const match = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (match) {
                            const confronto = match[0].trim();

                            if (!jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);

                                const mensagem = `⚽ *JOGO DE HOJE*\n` +
                                                 `━━━━━━━━━━━━━━\n` +
                                                 `*Partida:* ${confronto}\n` +
                                                 `━━━━━━━━━━━━━━`;

                                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Enviado da Tabela Hoje: ${confronto}`);
                            }
                        }
                    }
                });
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 

monitorarJogos();
