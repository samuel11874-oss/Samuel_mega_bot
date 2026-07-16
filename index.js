const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Online - Modo Debug'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Referer': 'https://www.google.com/',
};

async function monitorarJogos() {
    console.log("--------------------------------------------------");
    console.log("[INICIANDO BUSCA] Analisando tabelas do site...");
    
    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: HEADERS,
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        let encontrados = 0;
        let enviados = 0;

        // BUSCA MUDADA: Agora olhamos para todas as linhas (tr) dentro de tabelas
        $('table tr').each((i, el) => {
            const texto = $(el).text().trim().replace(/\s+/g, ' ');
            
            // Só tentamos processar se a linha tiver um " x " (indicando jogo)
            if (texto.includes(' x ')) {
                encontrados++;
                
                // Log para sabermos o que o robô está lendo (vai aparecer no seu Render)
                if (i < 10) console.log(`[DEBUG LINHA ${i}]: ${texto.substring(0, 50)}...`);

                // Regex adaptada para capturar números após o confronto
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

        console.log(`[FIM DA VARREDURA] Total de linhas com 'x' encontradas: ${encontrados} | Enviados: ${enviados}`);
        if (encontrados === 0) console.log("Atenção: Nenhuma linha com 'x' foi encontrada. O site mudou drasticamente a estrutura.");
        
    } catch (e) {
        console.error("Erro na varredura:", e.message);
    }
}

setInterval(monitorarJogos, 600000); 
monitorarJogos();
