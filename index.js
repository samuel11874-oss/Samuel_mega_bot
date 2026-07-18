const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Scanner Sem Bloqueios'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// O cache agora dura muito mais tempo para evitar repetições
let jogosEnviados = new Set();

// Limpeza ultra-precisa: transforma "Vasco da Gama x Mirassol" em "vascodagamaxmirassol"
function gerarChaveUnica(timeA, timeB) {
    const limpa = (t) => t.toLowerCase().replace(/[^a-z]/g, '');
    return limpa(timeA) + 'x' + limpa(timeB);
}

async function monitorarJogos() {
    console.log(`🔍 Varredura iniciada...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        const textoPagina = $('body').text();
        
        // Regex para capturar "Time A x Time B"
        const regexJogo = /([A-Za-zÀ-ÿ\s]{4,})\sx\s([A-Za-zÀ-ÿ\s]{4,})/g;
        let match;
        let encontrados = 0;

        while ((match = regexJogo.exec(textoPagina)) !== null) {
            const timeA = match[1].trim();
            const timeB = match[2].trim();
            const jogoCompleto = `${timeA} x ${timeB}`;
            
            // Pega o trecho do texto logo após o nome do jogo para achar a média
            const trecho = textoPagina.substring(match.index, match.index + 200);
            const numeros = trecho.match(/(\d{1,2}[.,]\d)/g);
            
            if (numeros && numeros.length >= 2) {
                const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                const chave = gerarChaveUnica(timeA, timeB);
                
                // Filtro de Média e Deduplicação
                if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    encontrados++;
                    
                    const msg = `⚽ *Oportunidade (HOJE)*\n\n` +
                                `⚔️ *Jogo:* ${jogoCompleto}\n` +
                                `📊 *Média de escanteios:* ${media.toFixed(1)}`;
                    
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                    console.log(`✅ ENVIADO: ${jogoCompleto} | Chave: ${chave} | Média: ${media.toFixed(1)}`);
                }
            }
        }
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca:", e.message);
    }
}

// Reseta a lista de enviados apenas a cada 12 horas
setInterval(() => { jogosEnviados.clear(); }, 43200000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
