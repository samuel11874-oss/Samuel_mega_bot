const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V48 Stealth Max 🕵️‍♂️⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV48() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V48 - STEALTH MAX] Iniciando com camuflagem avançada...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });

        const page = await browser.newPage();
        
        // Camuflagem profunda para apagar qualquer vestígio de bot/webdriver
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            window.navigator.chrome = { runtime: {} };
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        });

        const urlAlvo = 'https://www.totalcorner.com/pt/match/live';
        console.log(`🌐 Acessando camuflado: ${urlAlvo} ...`);
        
        await page.goto(urlAlvo, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização e estabilização da tabela...");
        await page.waitForSelector('tr', { timeout: 25000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 5000));

        // Extração com filtro focado em partidas ativas
        const jogosAoVivo = await page.evaluate(() => {
            const resultados = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach((tr) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                
                if (teamLinks.length >= 2) {
                    resultados.push({
                        timeA: teamLinks[0].innerText.trim(),
                        timeB: teamLinks[1].innerText.trim(),
                        linhaCompleta: texto
                    });
                }
            });

            return resultados;
        });

        console.log(`⚡ [Bot V48] Partidas reais filtradas com sucesso: ${jogosAoVivo.length}`);

        let msg = `🕵️‍♂️ <b>[RADAR V48 - STEALTH MAX]</b>\n`;
        msg += `⚽ Jogos Ao Vivo capturados: <code>${jogosAoVivo.length}</code>\n\n`;

        if (jogosAoVivo.length > 0) {
            for (let i = 0; i < Math.min(6, jogosAoVivo.length); i++) {
                const j = jogosAoVivo[i];
                msg += `🔴 <b>${j.timeA}</b> vs <b>${j.timeB}</b>\n`;
                msg += `📄 <code>${j.linhaCompleta.substring(0, 100)}</code>\n\n`;
            }
        } else {
            msg += `ℹ️ Linhas lidas, mas nenhuma correspondeu aos links de equipes ativas.`;
        }

        await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});

    } catch (error) {
        console.error("❌ Erro V48:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V48:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 3 minutos
setInterval(executarRadarV48, 180000);
executarRadarV48();
