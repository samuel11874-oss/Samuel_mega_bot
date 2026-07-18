const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em Modo de Teste Imediato'));
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
        console.log(`⏰ MODO TESTE ATIVO: Disparando agora...`);
        
        jogosEnviados.clear(); // Limpa o cache para enviar tudo de novo

        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 20000
        });

        const $ = cheerio.load(response.data);
        let emSecaoHoje = false;

        $('div, tr').each((i, el) => {
            const rawText = $(el).text().trim().replace(/\s+/g, ' ');
            const texto = rawText.toLowerCase();

            if (texto.includes('hoje')) {
                emSecaoHoje = true;
            } else if (['amanhã', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'].some(d => texto.includes(d))) {
                emSecaoHoje = false;
            }

            if (emSecaoHoje && texto.includes(' x ')) {
                const matchConfronto = rawText.match(/([A-Za-zÀ-ÿ\s]+)\sx\s([A-Za-zÀ-ÿ\s]+)/);
                
                if (matchConfronto) {
                    const jogoFinal = matchConfronto[0].replace(/Hoje/gi, '').trim();
                    const numeros = rawText.match(/(\d{1,2}[.,]\d)/g);
                    let media = 0;
                    if (numeros && numeros.length >= 2) {
                        media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    }

                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogoFinal)) {
                        jogosEnviados.add(jogoFinal);
                        bot.sendMessage(CHAT_ID, `⚽ *Oportunidade encontrada*\n\n⚔️ ${jogoFinal}\n📊 Média de escanteios FT: ${media.toFixed(1)}`, { parse_mode: 'Markdown' });
                        console.log(`✅ TESTE ENVIADO: ${jogoFinal} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro no teste:", e.message);
    }
}

// Roda uma vez imediatamente ao ligar
monitorarJogos();
// Mantém o bot vivo
setInterval(monitorarJogos, 300000); 
