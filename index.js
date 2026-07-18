const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Varredura por Regex'));
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
            timeout: 25000
        });

        const $ = cheerio.load(response.data);
        const textoCompleto = $('body').text();
        
        // Divide o texto em blocos baseados em quebras de linha
        const linhas = textoCompleto.split('\n');

        linhas.forEach(linha => {
            const linhaLimpa = linha.trim();
            
            // Filtro: Se a linha tem ' x ' E não é data futura, processamos
            const datasFuturas = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo', 'julho', 'agosto', 'setembro'];
            const ehDataFutura = datasFuturas.some(d => linhaLimpa.toLowerCase().includes(d));

            if (linhaLimpa.includes(' x ') && !ehDataFutura) {
                // Regex captura: [Nome Time] x [Nome Time]
                const matchConfronto = linhaLimpa.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/);
                
                if (matchConfronto) {
                    const jogo = matchConfronto[0].trim();
                    
                    // Regex captura números decimais (ex: 4.6 4.9)
                    const numeros = linhaLimpa.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));

                        if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogo)) {
                            jogosEnviados.add(jogo);
                            
                            bot.sendMessage(CHAT_ID, `⚽ *Oportunidade (Hoje)*\n\n⚔️ ${jogo}\n📊 Média FT: ${media.toFixed(1)}`, { parse_mode: 'Markdown' })
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

// Limpeza e loop
setInterval(() => { jogosEnviados.clear(); }, 3600000); 
setInterval(monitorarJogos, 300000); 
monitorarJogos();
