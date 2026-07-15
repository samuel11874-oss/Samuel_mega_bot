const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo: Monitoramento 1 Gol'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

async function monitorarJogos() {
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', { headers: HEADERS });
        const $ = cheerio.load(data);
        
        const jogosParaAlerta = [];
        $('.statln2').each((i, el) => {
            let texto = $(el).text().trim();
            // Remove data e limpa o texto
            texto = texto.replace(/(.*?)2026/, '').trim();
            
            // Captura o confronto
            const match = texto.match(/(.*?\s?x\s?.*?)/);
            if (match) {
                jogosParaAlerta.push(match[1].trim());
            }
        });

        // Remove duplicatas
        const jogosUnicos = [...new Set(jogosParaAlerta)];
        
        if (jogosUnicos.length > 0) {
            let mensagem = "🎯 *Análise de Mercado: Potencial para 1 Gol*\n\n";
            jogosUnicos.forEach(j => {
                mensagem += `⚽ ${j}\n`;
            });
            mensagem += "\n_Análise baseada nos jogos com maior probabilidade identificados._";
            
            await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' });
            console.log("Alerta enviado com sucesso.");
        }
    } catch (e) {
        console.error("Erro no monitoramento:", e.message);
    }
}

// Roda a cada 60 minutos
setInterval(monitorarJogos, 3600000);
monitorarJogos();
