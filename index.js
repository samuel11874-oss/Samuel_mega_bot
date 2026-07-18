const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Filtro de Data Validado'));
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
        
        // Estado: 'aguardando', 'hoje', 'bloqueado'
        let estadoSecao = 'aguardando'; 

        $('div, tr, li, td, span').each((i, el) => {
            const texto = $(el).text().trim().toLowerCase();
            
            // 1. Identifica o cabeçalho
            if (texto.includes('hoje')) {
                estadoSecao = 'hoje';
            } 
            // Se encontrar qualquer dia futuro ou outro cabeçalho, bloqueia a captura
            else if (['amanhã', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'].some(dia => texto.includes(dia))) {
                estadoSecao = 'bloqueado';
            }

            // 2. Processa apenas se estivermos na seção 'hoje'
            if (estadoSecao === 'hoje' && texto.includes(' x ')) {
                const matchNumero = texto.match(/(\d{2}[.,]\d)/);
                
                if (matchNumero) {
                    const valor = parseFloat(matchNumero[0].replace(',', '.'));

                    if (valor > 10.5 && valor <= 15.0) {
                        // Limpeza do confronto
                        const jogoLimpo = $(el).text().trim().replace(/hoje/gi, '').trim();
                        const matchConfronto = jogoLimpo.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
                        
                        if (matchConfronto) {
                            const jogoFinal = matchConfronto[0].trim();
                            
                            if (!jogosEnviados.has(jogoFinal)) {
                                jogosEnviados.add(jogoFinal);

                                bot.sendMessage(CHAT_ID, `✅ *OPORTUNIDADE REAL (HOJE)*\n⚔️ ${jogoFinal}\n📊 Média FT: ${valor.toFixed(1)}`, { parse_mode: 'Markdown' });
                                console.log(`✅ ENVIADO HOJE: ${jogoFinal}`);
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
