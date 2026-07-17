const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Filtro 10.5 Cantos'));
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

            // 1. ATIVAÇÃO: Só processa o que estiver abaixo do cabeçalho "Hoje"
            if (textoLower.includes('hoje')) {
                podeProcessar = true;
                return;
            }

            // 2. BLOQUEIO: Se o site citar outras datas, para a leitura
            if (podeProcessar && (textoLower.includes('amanhã') || /\d{2}\/\d{2}/.test(textoLower))) {
                podeProcessar = false;
                return;
            }

            // 3. FILTRO DE JOGO E MÉDIA:
            if (podeProcessar && textoLower.includes(' x ')) {
                // Regex para encontrar números de média (ex: 10.6, 11.2)
                // Procura por números no formato "XX.X" ou "XX,X"
                const statsMatch = linhaTexto.match(/(\d{2}[.,]\d)/);

                if (statsMatch) {
                    const media = parseFloat(statsMatch[0].replace(',', '.'));

                    // FILTRO RÍGIDO: Só envia se a média for > 10.5
                    if (media > 10.5) {
                        const matchConfronto = linhaTexto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            const confronto = matchConfronto[0].trim();

                            if (!jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);

                                const mensagem = 
`⚽ *OPORTUNIDADE DE CANTOS*\n` +
`━━━━━━━━━━━━━━━━━━\n` +
`⚔️ *Partida:* ${confronto}\n` +
`📈 *Média FT:* ${media.toFixed(1)}\n` +
`📅 *Data:* Hoje (17/07/2026)\n` +
`━━━━━━━━━━━━━━━━━━\n` +
`🔗 _Análise validada pelo robô_`;

                                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Enviado: ${confronto} (Média: ${media})`);
                            }
                        }
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
