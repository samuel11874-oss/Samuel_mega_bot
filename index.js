const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Varredura Completa Ativa'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.google.com/'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    try {
        console.log(`🔍 Iniciando varredura em todas as divisões...`);
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: HEADERS,
            timeout: 25000
        });

        const $ = cheerio.load(response.data);
        const textoCompleto = $('body').text();
        const linhas = textoCompleto.split('\n');

        linhas.forEach(linha => {
            const linhaLimpa = linha.trim();

            // Padrão: Precisa ter " x " e não ser uma data de dias futuros (segunda a domingo ou meses)
            if (linhaLimpa.includes(' x ') && !linhaLimpa.match(/(segunda|terça|quarta|quinta|sexta|sábado|domingo|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i)) {
                
                // Busca o padrão de confronto (Time x Time)
                const matchConfronto = linhaLimpa.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/);
                
                if (matchConfronto) {
                    const jogo = matchConfronto[0].trim();
                    
                    // Busca números de escanteios (ex: 5.2 6.1)
                    const numeros = linhaLimpa.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));

                        // Filtro de 9.5 a 15.0
                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogo)) {
                            jogosEnviados.add(jogo);
                            
                            bot.sendMessage(CHAT_ID, `⚽ *Oportunidade (Varredura Completa)*\n\n⚔️ ${jogo}\n📊 Média FT: ${media.toFixed(1)}`, { parse_mode: 'Markdown' })
                               .catch(err => console.error("Erro Telegram:", err.message));
                            
                            console.log(`✅ ENVIADO: ${jogo} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache de envio a cada 1 hora para renovar os jogos
setInterval(() => { jogosEnviados.clear(); }, 3600000); 

// Varredura a cada 5 minutos
setInterval(monitorarJogos, 300000); 
monitorarJogos();
