const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo - Modo Leitura de Texto'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        const textoCompleto = $('body').text();
        const linhas = textoCompleto.split('\n'); // Divide o site em linhas de texto

        let capturandoHoje = false;

        for (let linha of linhas) {
            let linhaLimpa = linha.trim();
            let linhaLower = linhaLimpa.toLowerCase();

            // 1. ATIVAÇÃO: Se achar "hoje", liga a captura
            if (linhaLower.includes('hoje')) {
                capturandoHoje = true;
                continue;
            }

            // 2. BLOQUEIO: Se achar "amanhã" ou datas, desliga a captura
            if (capturandoHoje && (linhaLower.includes('amanhã') || /\d{2}\/\d{2}/.test(linhaLower))) {
                capturandoHoje = false;
                continue;
            }

            // 3. PROCESSAMENTO: Só olha se estiver no bloco de "Hoje" e tiver um confronto
            if (capturandoHoje && linhaLimpa.includes(' x ')) {
                // Regex para capturar números decimais (ex: 10.6, 11.2)
                const statMatch = linhaLimpa.match(/(\d{2}[.,]\d)/);
                
                if (statMatch) {
                    const media = parseFloat(statMatch[0].replace(',', '.'));

                    // Filtro da Média > 10.5
                    if (media > 10.5) {
                        const matchConfronto = linhaLimpa.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            const confronto = matchConfronto[0].trim();

                            if (!jogosEnviados.has(confronto)) {
                                jogosEnviados.add(confronto);

                                const mensagem = 
`⚽ *OPORTUNIDADE DE CANTO*\n` +
`━━━━━━━━━━━━━━━━━━\n` +
`⚔️ *Partida:* ${confronto}\n` +
`📈 *Média FT:* ${media.toFixed(1)}\n` +
`📅 *Data:* Hoje (17/07/2026)\n` +
`━━━━━━━━━━━━━━━━━━\n` +
`🔗 _Análise validada pelo sistema_`;

                                bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(console.error);
                                console.log(`✅ Enviado: ${confronto} (Média: ${media})`);
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Erro na leitura:", e.message);
    }
}

// Limpa cache diário e monitora a cada 5 min
setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 

monitorarJogos();
