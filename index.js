const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V57 Scroll Completo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV57() {
    let browser = null;
    try {
        console.log("⚡ [Radar V57] Iniciando varredura com rolagem profunda...");

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

        console.log("⏳ Aguardando carregamento inicial...");
        await new Promise(r => setTimeout(r, 6000));

        // Rola a página várias vezes para forçar o carregamento de todos os jogos ocultos (lazy load)
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Extrai todas as linhas e blocos de partidas únicos encontrados
        const partidasMapeadas = await page.evaluate(() => {
            const lista = [];
            const elementos = document.querySelectorAll('tr, .match-row, .match-item');

            elementos.forEach((el) => {
                const texto = el.innerText.replace(/\s+/g, ' ').trim();
                if ((texto.includes('vs') || texto.includes(' - ')) && texto.length > 10) {
                    if (!lista.includes(texto)) {
                        lista.push(texto);
                    }
                }
            });

            return lista;
        });

        console.log(`📊 Total de partidas únicas mapeadas com scroll: ${partidasMapeadas.length}`);

        if (partidasMapeadas.length > 0) {
            let msg = `🔥 <b>[RADAR TOTALCORNER - COMPLETO]</b>\n`;
            msg += `⚽ Jogos únicos encontrados: <code>${partidasMapeadas.length}</code>\n\n`;
            
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
        console.error("❌ Erro V57:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V57:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV57();
setInterval(executarRadarV57, 180000);
