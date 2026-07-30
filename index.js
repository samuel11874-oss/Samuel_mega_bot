const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V39 Sniffer de API 🕵️‍♂️📡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV39Sniffer() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V39 - SNIFFER DE API] Monitorando requisições de rede do TotalCorner...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1366,768'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

        // Intercepta e escuta todas as respostas de rede do navegador
        page.on('response', async (response) => {
            const url = response.url();
            // Filtra URLs que possam conter dados de partidas
            if (url.includes('match') || url.includes('live') || url.includes('data') || url.includes('json') || url.includes('ajax') || url.includes('get')) {
                try {
                    const contentType = response.headers()['content-type'] || '';
                    if (contentType.includes('json') || contentType.includes('javascript') || contentType.includes('text')) {
                        const text = await response.text().catch(() => '');
                        if (text.length > 50 && (text.includes('home') || text.includes('away') || text.includes('corner') || text.includes('score'))) {
                            console.log(`\n📦 [API CAPTURADA] URL: ${url}`);
                            console.log(`📄 Amostra do Conteúdo: ${text.substring(0, 300)}...\n`);
                        }
                    }
                } catch (e) {}
            }
        });

        console.log("🌐 Acessando https://www.totalcorner.com/match/live ...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando 10 segundos para capturar as chamadas de dados ao vivo...");
        await new Promise(r => setTimeout(r, 10000));

        console.log("✅ [Bot V39] Sniffing de rede finalizado.");
        await bot.sendMessage(CHAT_ID, `🕵️‍♂️ <b>[V39 SNIFFER]</b> Varredura de API concluída. Confira o log no Render!`, { parse_mode: 'HTML' }).catch(() => {});

    } catch (error) {
        console.error("❌ Erro no Sniffer V39:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V39:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV39Sniffer();
