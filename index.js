const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V56 Definitivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV56() {
    let browser = null;
    try {
        console.log("⚡ [Radar V56] Varrendo partidas do TotalCorner...");

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
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log("⏳ Aguardando carregamento da tabela...");
        await new Promise(r => setTimeout(r, 10000));

        const partidasMapeadas = await page.evaluate(() => {
            const lista = [];
            const trs = document.querySelectorAll('tr');

            trs.forEach((tr) => {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 4) {
                    const colunas = Array.from(tds).map(td => td.innerText.replace(/\s+/g, ' ').trim());
                    const textoLinha = colunas.join(' | ');
                    
                    // Pega linhas que contenham confronto
                    if (textoLinha.includes('vs') || textoLinha.includes(' - ')) {
                        lista.push(textoLinha);
                    }
                }
            });

            return lista;
        });

        console.log(`📊 Total de partidas mapeadas: ${partidasMapeadas.length}`);

        if (partidasMapeadas.length > 0) {
            let msg = `🔥 <b>[RADAR TOTALCORNER - AO VIVO]</b>\n`;
            msg += `⚽ Jogos listados: <code>${partidasMapeadas.length}</code>\n\n`;
            
            await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 0; i < Math.min(partidasMapeadas.length, 10); i++) {
                let card = `⚽ <b>JOGO #${i+1}</b>\n`;
                card += `📄 <code>${partidasMapeadas[i]}</code>`;
                
                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            console.log("ℹ️ Nenhuma partida encontrada.");
        }

    } catch (error) {
        console.error("❌ Erro V56:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V56:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV56();
setInterval(executarRadarV56, 180000);
