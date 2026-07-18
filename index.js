const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot de Escanteios - Filtro de Hoje Ativo'));
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
        console.log(`🔍 Varredura iniciada...`);
        
        const response = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        let isToday = false; // Trava de segurança
        
        // Palavras que indicam que a seção de "Hoje" acabou
        const outrasDatas = ['amanhã', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

        $('tr, div').each((i, el) => {
            const rawText = $(el).text().trim().replace(/\s+/g, ' ');
            const texto = rawText.toLowerCase();

            // Ativa apenas se encontrar "Hoje"
            if (texto.includes('hoje') || texto.includes('today')) {
                isToday = true;
                return;
            }

            // Desativa se encontrar qualquer outra data/dia da semana
            if (outrasDatas.some(dia => texto.includes(dia))) {
                isToday = false;
                return;
            }

            // Processa o jogo APENAS se isToday estiver true
            if (isToday && texto.includes(' x ')) {
                const matchConfronto = rawText.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                
                if (matchConfronto) {
                    const jogoFinal = matchConfronto[0].replace(/Hoje/gi, '').trim();
                    const numeros = rawText.match(/(\d{1,2}[.,]\d)/g);
                    let media = 0;
                    
                    if (numeros && numeros.length >= 2) {
                        media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    }

                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogoFinal)) {
                        jogosEnviados.add(jogoFinal);
                        bot.sendMessage(CHAT_ID, `⚽ *Oportunidade (HOJE)*\n\n⚔️ ${jogoFinal}\n📊 Média FT: ${media.toFixed(1)}`, { parse_mode: 'Markdown' });
                        console.log(`✅ ENVIADO: ${jogoFinal} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro na busca (será ignorado para manter o bot vivo):", e.message);
    }
}

// Limpeza de cache a cada 2 horas para renovar os jogos
setInterval(() => { jogosEnviados.clear(); }, 7200000); 

// Rodar a cada 10 minutos (espaço maior para evitar erros de rede)
setInterval(monitorarJogos, 600000); 
monitorarJogos();
