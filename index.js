const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Operacional - Global Scanner'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let jogosEnviados = new Set();

async function monitorarJogos() {
    console.log(`🔍 Iniciando Varredura Global...`);
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        
        // Debug: Loga o tamanho da página para saber se estamos recebendo dados
        console.log(`Página carregada. Tamanho: ${data.length} caracteres.`);
        
        // Pega todo o texto da página de uma vez, sem depender de tags específicas (tr, div)
        const $ = cheerio.load(data);
        const textoCompleto = $('body').text();
        
        // Regex para encontrar "Time X Time" (agora mais flexível)
        const regexJogo = /([A-Za-zÀ-ÿ\s]{4,})\s?x\s?([A-Za-zÀ-ÿ\s]{4,})/g;
        let match;
        let encontrados = 0;

        // Itera sobre todas as ocorrências encontradas no texto todo
        while ((match = regexJogo.exec(textoCompleto)) !== null) {
            const jogoOriginal = match[0].trim();
            
            // Tenta pegar números próximos ao jogo
            const trecho = textoCompleto.substring(match.index, match.index + 150);
            const numeros = trecho.match(/(\d{1,2}[.,]\d)/g);
            
            if (numeros && numeros.length >= 2) {
                const media = parseFloat(numeros[0].replace(',', '.')) + parseFloat(numeros[1].replace(',', '.'));
                const chaveUnica = jogoOriginal.toLowerCase().replace(/[^a-z]/g, '');
                
                if (media > 9.5 && media <= 15.0 && !jogosEnviados.has(chaveUnica)) {
                    jogosEnviados.add(chaveUnica);
                    encontrados++;
                    
                    const msg = `⚽ *Oportunidade Encontrada*\n\n` +
                                `⚔️ *Jogo:* ${jogoOriginal}\n` +
                                `📊 *Média de escanteios:* ${media.toFixed(1)}`;
                    
                    bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(e => {});
                    console.log(`✅ ENVIADO: ${jogoOriginal} | Média: ${media.toFixed(1)}`);
                }
            }
        }
        
        console.log(`🔍 Varredura concluída. Novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na busca (verifique se o site mudou o link):", e.message);
    }
}

// Reseta o cache a cada 6 horas
setInterval(() => { jogosEnviados.clear(); }, 21600000);
setInterval(monitorarJogos, 300000);
monitorarJogos();
