const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Passo 2 TotalCorner ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function passo2TotalCorner() {
    let browser = null;
    try {
        console.log("🏁 [Passo 2] Iniciando navegador com argumentos de segurança para o Render...");

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

        const titulo = await page.title();
        console.log(`📄 Título da página obtido: ${titulo}`);

        await bot.sendMessage(CHAT_ID, `🏁 <b>[Passo 2]</b> Navegador aberto com sucesso!\n📄 Título: <code>${titulo}</code>`, { parse_mode: 'HTML' });

    } catch (error) {
        console.error("❌ Erro no Passo 2:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro Passo 2:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Executa para validar
passo2TotalCorner();
