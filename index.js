const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Ativo e Escaneando'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function monitorarJogos() {
    console.log("--------------------------------------------------");
    console.log("[INICIANDO BUSCA] Analisando WinDrawWin...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        
        let encontrados = 0;
        let enviados = 0;

        // O novo seletor foca nos blocos de jogos que contêm os dados de escanteios
        $('div.statln').each((i, el) => {
            const texto = $(el).text().trim();
            
            // Procura por jogos que contenham 'x' entre dois times
            if (texto.includes(' x ')) {
                encontrados++;
                
                // Extração agressiva de números (busca qualquer decimal ou inteiro após o nome do time B)
                const match = texto.match(/(.+?)\s+x\s+(.+?)\s+(\d{1,2}(?:\.\d{1,2})?)/);
                
                if (match) {
                    const timeA = match[1].trim();
                    const timeB = match[2].trim();
                    const media = parseFloat(match[3]);
                    
                    if (media > 10.5) {
                        enviados++;
                        bot.sendMessage(CHAT_ID, `🔥 *Oportunidade:* ${timeA} x ${timeB} | Média: ${media} Cantos`).catch(console.error);
                        console.log(`[ALERTA ENVIADO] ${timeA} x ${timeB} -> ${media}`);
                    }
                }
            }
        });

        console.log(`[FIM DA VARREDURA] Total encontrados: ${encontrados} | Enviados: ${enviados}`);
    } catch (e) {
        console.error("Erro na varredura:", e.message);
    }
}

setInterval(monitorarJogos, 600000); // Roda a cada 10 minutos
monitorarJogos();
