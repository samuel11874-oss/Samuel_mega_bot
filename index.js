const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V47 Definitivo ⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV47() {
    let browser = null;
    try {
        console.log("⚡ [Bot V47] Acessando URL direta /pt/match/live com espera inteligente...");

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

        const urlAlvo = 'https://www.totalcorner.com/pt/match/live';
        console.log(`🌐 Acessando ${urlAlvo} ...`);
        
        await page.goto(urlAlvo, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log("⏳ Aguardando a tabela de linhas (tr) carregar no DOM...");
        // Trava a execução até que o elemento <tr> realmente exista na página
        await page.waitForSelector('tr', { timeout: 25000 }).catch(() => {
            console.log("⚠️ Timeout aguardando por <tr>, prosseguindo com captura...");
        });

        // Pequena folga para estabilizar os dados dinâmicos
        await new Promise(r => setTimeout(r, 3000));

        const linhasBrutas = await page.evaluate(() => {
            const resultados = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                if (texto.length > 3) {
                    resultados.push({
                        id: index,
                        linha: texto
                    });
                }
            });

            return resultados;
        });

        console.log(`📊 Total de linhas brutas encontradas na V47: ${linhasBrutas.length}`);

        let msg = `⚡ <b>[RADAR V47 - AO VIVO]</b>\n`;
        msg += `📊 Linhas capturadas: <code>${linhasBrutas.length}</code>\n\n`;

        if (linhasBrutas.length > 0) {
            for (let i = 0; i < Math.min(8, linhasBrutas.length); i++) {
                msg += `🔹 <code>${linhasBrutas[i].linha.substring(0, 120)}</code>\n`;
            }
        } else {
            msg += `❌ Nenhuma linha encontrada.`;
        }

        await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});

    } catch (error) {
        console.error("❌ Erro V47:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V47:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 3 minutos
setInterval(executarRadarV47, 180000);
executarRadarV47();
