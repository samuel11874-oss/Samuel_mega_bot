const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('Bot Agendado Ativo'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Identidade Mobile blindada
const MOBILE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Referer': 'https://www.google.com/'
};

// Memória para não repetir alertas de jogos que já enviamos hoje
let jogosEnviados = new Set();

function estaNoHorario() {
    const agora = new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"});
    const hora = new Date(agora).getHours();
    
    // Manhã (06h até 11h) ou Tarde/Noite (12h até 20h)
    return (hora >= 6 && hora <= 11) || (hora >= 12 && hora <= 20);
}

async function monitorarJogos() {
    if (!estaNoHorario()) {
        console.log(`[PAUSA] Fora do horário de alerta (Hora atual fora da janela).`);
        return;
    }

    console.log("--------------------------------------------------");
    console.log("[VARREDURA AGENDADA] Buscando jogos de HOJE > 10.5...");

    try {
        const { data } = await axios.get('https://www.windrawwin.com/br/estatisticas/escanteios/', {
            headers: MOBILE_HEADERS,
            timeout: 15000
        });

        const $ = cheerio.load(data);
        let encontrados = 0;

        $('tr').each((i, el) => {
            const linha = $(el).text().trim().replace(/\s+/g, ' ');
            const match = linha.match(/(\d{1,2}\.\d)/);
            
            // Só processa se for jogo e tiver média alta
            if (linha.includes(' x ') && match) {
                const media = parseFloat(match[1]);
                
                // Filtro: > 10.5 e evita cabeçalhos
                if (media > 10.5 && !linha.toLowerCase().includes('estatísticas')) {
                    
                    // Verifica se já enviamos este jogo hoje
                    if (!jogosEnviados.has(linha)) {
                        jogosEnviados.add(linha);
                        encontrados++;
                        bot.sendMessage(CHAT_ID, `⚽ *Oportunidade de Hoje:*\n${linha}\n📊 *Média:* ${media} Cantos`).catch(console.error);
                        console.log(`[ALERTA ENVIADO]: ${linha}`);
                    }
                }
            }
        });

        console.log(`[FIM] Total de novos jogos encontrados: ${encontrados}`);
        
    } catch (e) {
        console.error("Erro na varredura:", e.message);
    }
}

// Reseta a lista de jogos enviados a cada 24h (para recomeçar do zero no dia seguinte)
setInterval(() => { jogosEnviados.clear(); }, 86400000);

// Roda a cada 20 minutos para manter o servidor vivo e checar novos jogos
setInterval(monitorarJogos, 1200000); 
monitorarJogos();
