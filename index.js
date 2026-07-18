const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Modo Diagnóstico'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log(`🔍 Iniciando Varredura Bruta...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        
        // DEBUG: Imprime o começo da página para sabermos se estamos baixando o conteúdo certo
        console.log("DEBUG: Primeiros 500 caracteres do site:", data.substring(0, 500));

        const $ = cheerio.load(data);
        const textoCompleto = $('body').text(); // Pega todo o texto da página

        let encontrados = 0;

        // Procura todos os jogos (padrão Time X Time) no texto total
        // A regex abaixo é mais tolerante
        const matches = [...textoCompleto.matchAll(/([A-Za-zÀ-ÿ\s]{4,})\s[xX]\s([A-Za-zÀ-ÿ\s]{4,})/g)];
        
        for (const match of matches) {
            const jogoCompleto = match[0].trim();
            const timeA = match[1].trim();
            const timeB = match[2].trim();
            
            // Procura números próximos ao jogo
            const trecho = textoCompleto.substring(match.index, match.index + 100);
            const numeros = trecho.match(/(\d{1,2}[.,]\d)/g);
            
            if (numeros && numeros.length >= 2) {
                const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                const chave = (timeA + timeB).toLowerCase().replace(/[^a-z]/g, '');
                
                if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chave)) {
                    jogosEnviados.add(chave);
                    encontrados++;
                    
                    const msg = `⚽ *Oportunidade Encontrada*\n\n` +
                                `⚔️ *Jogo:* ${jogoCompleto}\n` +
                                `📊 *Média:* ${media.toFixed(1)}`;
                    
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                    console.log(`✅ ENVIADO: ${jogoCompleto} | Média: ${media.toFixed(1)}`);
                }
            }
        }
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca (verifique se a URL está correta):", e.message);
    }
}

// Reseta a lista a cada 6 horas
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000); // 5 minutos
monitorarJogos();
