const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Modo Extrator'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log(`🔍 Iniciando varredura com Extrator Inteligente...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        let encontrados = 0;

        // Varre todos os blocos de texto
        $('div, tr, td, p, span').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Regex focado apenas nos nomes dos times (letras e espaços)
            // Ignora qualquer número ou palavra que venha grudada
            const match = texto.match(/([A-Za-zÀ-ÿ\s]{3,})\sx\s([A-Za-zÀ-ÿ\s]{3,})/);
            
            if (match) {
                const timeCasa = match[1].trim();
                const timeFora = match[2].trim();
                const jogoLimpo = `${timeCasa} x ${timeFora}`;
                
                // Busca os números de escanteio no mesmo bloco de texto
                const numeros = texto.match(/(\d{1,2}[.,]\d)/g);
                
                if (numeros && numeros.length >= 2) {
                    const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                    
                    // Filtro de 9.5 a 15.0 e evita duplicados
                    if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(jogoLimpo)) {
                        jogosEnviados.add(jogoLimpo);
                        encontrados++;
                        
                        const msg = `⚽ *Oportunidade Encontrada*\n\n` +
                                    `⚔️ *Jogo:* ${jogoLimpo}\n` +
                                    `📊 *Média de escanteios FT:* ${media.toFixed(1)}`;
                        
                        bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                        console.log(`✅ ENVIADO: ${jogoLimpo} | Média: ${media.toFixed(1)}`);
                    }
                }
            }
        });
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache de jogos a cada 1 hora para não parar de enviar
setInterval(() => { jogosEnviados.clear(); }, 3600000);
setInterval(monitorarJogos, 300000);
monitorarJogos();
