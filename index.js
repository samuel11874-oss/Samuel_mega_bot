const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Modo Força Bruta'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function monitorarJogos() {
    console.log(`🔍 Iniciando varredura global (Força Bruta)...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        
        // Em vez de tr, buscamos todos os elementos que tenham texto
        const $ = cheerio.load(data);
        let encontrados = 0;

        // Itera sobre todos os elementos que possam conter o texto do jogo
        $('div, span, p, tr, td').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Procura pelo padrão "X" e garante que não seja uma data (segunda-feira, etc)
            if (texto.includes(' x ') && !texto.toLowerCase().match(/(segunda|terça|quarta|quinta|sexta|sábado|domingo|janeiro|fevereiro|março)/)) {
                
                const matchConfronto = texto.match(/([A-Za-zÀ-ÿ0-9\s]{4,})\sx\s([A-Za-zÀ-ÿ0-9\s]{4,})/);
                
                if (matchConfronto) {
                    const jogo = matchConfronto[0].trim();
                    const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                    
                    if (numeros && numeros.length >= 2) {
                        const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                        
                        // Filtro bem amplo para garantir que pegamos tudo
                        if (media > 8.0 && media <= 16.0) { 
                            encontrados++;
                            // Envio único
                            bot.sendMessage(CHAT_ID, `⚽ *Oportunidade*\n\n⚔️ ${jogo}\n📊 Média: ${media.toFixed(1)}`, { parse_mode: 'Markdown' })
                               .catch(e => {}); // Silencia erros de envio
                            console.log(`✅ ENVIADO: ${jogo} | Média: ${media.toFixed(1)}`);
                        }
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Total de blocos identificados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro crítico:", e.message);
    }
}

setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
