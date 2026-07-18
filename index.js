const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtrando apenas Hoje'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

// Função de limpeza corrigida com a barra escapada ( \/ )
function limparTexto(texto) {
    return texto.replace(/(Hoje|Começa em \d+ minutos|Mais|Menos|1\d+\/\d+|[0-9]{1,3})/gi, '').trim();
}

async function monitorarJogos() {
    console.log(`🔍 Varredura iniciada...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        let emSecaoHoje = false;
        let encontrados = 0;

        $('div, tr, td, p, span').each((i, el) => {
            const texto = $(el).text().trim();
            const textoLower = texto.toLowerCase();

            // Lógica de Seção
            if (textoLower.includes('hoje')) {
                emSecaoHoje = true;
            } else if (/(amanhã|segunda|terça|quarta|quinta|sexta|sábado|domingo|janeiro|fevereiro|março)/.test(textoLower)) {
                emSecaoHoje = false;
            }

            // Processa apenas na seção "Hoje"
            if (emSecaoHoje && texto.includes(' x ')) {
                const match = texto.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/);
                
                if (match) {
                    const jogoLimpo = limparTexto(match[0]);
                    const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        
                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogoLimpo)) {
                            jogosEnviados.add(jogoLimpo);
                            encontrados++;
                            
                            const msg = `⚽ *Oportunidade (HOJE)*\n\n` +
                                        `⚔️ *Jogo:* ${jogoLimpo}\n` +
                                        `📊 *Média de escanteios FT:* ${media.toFixed(1)}`;
                            
                            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                            console.log(`✅ ENVIADO (HOJE): ${jogoLimpo} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos de HOJE encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache a cada 30 minutos
setInterval(() => { jogosEnviados.clear(); }, 1800000);
setInterval(monitorarJogos, 300000);
monitorarJogos();
