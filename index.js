const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Limpeza de Nomes Ativa'));
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
        let emSecaoHoje = false;

        $('div').each((i, el) => {
            const bloco = $(el).text().trim();
            const texto = bloco.toLowerCase();

            if (texto.includes('hoje')) {
                emSecaoHoje = true;
            } else if (['amanhã', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'].some(d => texto.includes(d))) {
                emSecaoHoje = false;
            }

            if (emSecaoHoje && texto.includes(' x ')) {
                const matchConfronto = bloco.match(/([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/);
                
                if (matchConfronto) {
                    // Limpeza do nome do jogo: removemos palavras indesejadas
                    let jogoFinal = matchConfronto[0]
                        .replace(/(Hoje|minutos|hoje|minutos|time|futebol)/gi, '')
                        .trim();
                    
                    const numeros = bloco.match(/(\d{1,2}[.,]\d)/g);
                    let media = 0;
                    if (numeros && numeros.length >= 2) {
                        media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    }

                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogoFinal)) {
                        jogosEnviados.add(jogoFinal);
                        
                        // Envio protegido contra erros
                        bot.sendMessage(CHAT_ID, `⚽ *Oportunidade Encontrada*\n\n⚔️ ${jogoFinal}\n📊 Média de escanteios FT: ${media.toFixed(1)}`, { parse_mode: 'Markdown' })
                           .catch(err => console.error("Erro ao enviar Telegram:", err.message));
                        
                        console.log(`✅ ENVIADO: ${jogoFinal} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca (ignorado):", e.message);
    }
}

// Limpeza de cache a cada 1 hora
setInterval(() => { jogosEnviados.clear(); }, 3600000); 

// Roda a cada 5 minutos
setInterval(monitorarJogos, 300000); 
monitorarJogos();
