const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar TotalCorner Ativo ⚽⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarTotalCorner() {
    let browser = null;
    try {
        console.log("⚡ [Radar] Iniciando varredura automatizada no TotalCorner...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        console.log("🌐 Acessando https://www.totalcorner.com/pt/match/live ...");
        await page.goto('https://www.totalcorner.com/pt/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando os dados carregarem...");
        await page.waitForSelector('tr', { timeout: 20000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 4000));

        const partidas = await page.evaluate(() => {
            const lista = [];
            const trs = document.querySelectorAll('tr');
            
            trs.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                if (index > 0 && texto.includes('vs') && texto.length > 10) {
                    lista.push(texto);
                }
            });
            return lista;
        });

        console.log(`📊 Partidas ativas capturadas: ${partidas.length}`);

        if (partidas.length > 0) {
            let header = `⚡ <b>[RADAR TOTALCORNER - AO VIVO]</b>\n🔥 Total de jogos: <code>${partidas.length}</code>\n\n`;
            await bot.sendMessage(CHAT_ID, header, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            // Envia em blocos organizados para não estourar o limite do Telegram
            for (let i = 0; i < Math.min(partidas.length, 10); i++) {
                let card = `⚽ <b>JOGO #${i+1}</b>\n`;
                card += `📄 <code>${partidas[i]}</code>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            console.log("ℹ️ Nenhuma partida ativa no momento.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro no Radar:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a primeira vez ao iniciar e depois a cada 3 minutos (180000 ms)
executarRadarTotalCorner();
setInterval(executarRadarTotalCorner, 180000);
