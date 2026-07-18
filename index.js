const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot em Teste: Buscando apenas Amanhã'));
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
        
        // Estado: 'aguardando', 'amanhã', 'bloqueado'
        let estadoSecao = 'aguardando'; 

        $('div, tr, li, td, span').each((i, el) => {
            const texto = $(el).text().trim().toLowerCase();
            
            // Lógica do teste: Procura pela palavra "Amanhã"
            if (texto.includes('amanhã')) {
                estadoSecao = 'amanhã';
                console.log(">>> ENCONTREI A SEÇÃO: Amanhã");
            } 
            // Se achar qualquer outro dia, bloqueia
            else if (['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo', 'hoje'].some(dia => texto.includes(dia))) {
                estadoSecao = 'bloqueado';
            }

            // Processa apenas se estiver na seção de amanhã
            if (estadoSecao === 'amanhã' && texto.includes(' x ')) {
                const matchNumero = texto.match(/(\d{2}[.,]\d)/);
                
                if (matchNumero) {
                    const valor = parseFloat(matchNumero[0].replace(',', '.'));

                    if (valor > 10.5 && valor <= 15.0) {
                        const jogoLimpo = $(el).text().trim().replace(/amanhã/gi, '').trim();
                        const matchConfronto = jogoLimpo.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto && !jogosEnviados.has(matchConfronto[0])) {
                            const jogoFinal = matchConfronto[0].trim();
                            jogosEnviados.add(jogoFinal);

                            bot.sendMessage(CHAT_ID, `🚀 *TESTE AMANHÃ*\n⚔️ ${jogoFinal}\n📊 ${valor.toFixed(1)}`, { parse_mode: 'Markdown' });
                            console.log(`✅ ENVIADO TESTE AMANHÃ: ${jogoFinal}`);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Erro no teste:", e.message);
    }
}

setInterval(() => { jogosEnviados.clear(); }, 86400000); 
setInterval(monitorarJogos, 300000); 
monitorarJogos();
