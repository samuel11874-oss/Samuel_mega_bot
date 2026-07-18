const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Volume Máximo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log(`🔍 Iniciando Varredura...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        const textoCompleto = $('body').text();
        
        // Regex para capturar [Time] [x] [Time]
        // Ele para de ler se encontrar uma barra (|) ou dígitos, evitando pegar o nome da Liga junto
        const regexJogo = /([A-ZÀ-Ÿ][A-Za-zÀ-ÿ\s]{3,})\s*[xX]\s*([A-ZÀ-Ÿ][A-Za-zÀ-ÿ\s]{2,})(?=\s*\d|\s*\|)/g;
        
        let match;
        let encontrados = 0;

        while ((match = regexJogo.exec(textoCompleto)) !== null) {
            const timeA = match[1].trim();
            const timeB = match[2].trim();
            
            // Pega o contexto próximo para ler a média
            const contexto = textoCompleto.substring(match.index, match.index + 150);
            const numeros = contexto.match(/(\d{1,2}[.,]\d)/g);
            
            if (numeros && numeros.length >= 2) {
                const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                
                // Filtro de Média (9.5 a 15.0) + Bloqueio de Repetição
                if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    encontrados++;
                    
                    const msg = `⚽ *Oportunidade Encontrada*\n\n` +
                                `⚔️ *Jogo:* ${timeA} x ${timeB}\n` +
                                `📊 *Média:* ${media.toFixed(1)}`;
                    
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                    console.log(`✅ ENVIADO: ${timeA} x ${timeB} | Média: ${media.toFixed(1)}`);
                }
            }
        }
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta o cache a cada 6 horas para limpar jogos antigos e permitir novas entradas
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
