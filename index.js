const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtro de Data e Formatação Ajustados'));
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
        let emSecaoHoje = false;

        $('div, tr').each((i, el) => {
            const rawText = $(el).text().trim().replace(/\s+/g, ' ');
            const texto = rawText.toLowerCase();

            // Lógica de Seção: Identifica o que é 'Hoje'
            if (texto.includes('hoje')) {
                emSecaoHoje = true;
            } else if (['amanhã', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'].some(d => texto.includes(d))) {
                emSecaoHoje = false;
            }

            // Processa se estiver na seção 'Hoje' e contiver um confronto
            if (emSecaoHoje && texto.includes(' x ')) {
                const matchConfronto = rawText.match(/([A-Za-zÀ-ÿ\s]+)\sx\s([A-Za-zÀ-ÿ\s]+)/);
                
                if (matchConfronto) {
                    const jogoFinal = matchConfronto[0].replace(/Hoje/gi, '').trim();
                    
                    // Regex para calcular a média
                    const numeros = rawText.match(/(\d{1,2}[.,]\d)/g);
                    let media = 0;
                    if (numeros && numeros.length >= 2) {
                        media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    }

                    // Filtro de envio (9.5 a 15.0)
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogoFinal)) {
                        jogosEnviados.add(jogoFinal);
                        
                        // Formatação final do card conforme solicitado
                        bot.sendMessage(CHAT_ID, `⚽ *Oportunidade encontrada*\n\n⚔️ ${jogoFinal}\n📊 Média de escanteios FT: ${media.toFixed(1)}`, { parse_mode: 'Markdown' });
                        
                        console.log(`✅ ENVIADO: ${jogoFinal} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache de envio a cada 24 horas
setInterval(() => { jogosEnviados.clear(); }, 86400000); 
// Varredura a cada 5 minutos
setInterval(monitorarJogos, 300000); 
monitorarJogos();
