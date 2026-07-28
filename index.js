// Ordem direta: Procura o navegador APENAS dentro da pasta blindada do projeto
const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Online ⚽🕵️‍♂️</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function investigarEBurlarSoccerway() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot] Iniciando navegador com cache blindado da pasta do projeto...");
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

        console.log("🌐 [Bot] Acessando o Soccerway...");
        const response = await page.goto('https://br.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        const status = response.status();
        const tituloPagina = await page.title();
        const bodyTexto = await page.evaluate(() => document.body.innerText);

        console.log(`📊 Status HTTP: ${status} | 📌 Título: ${tituloPagina}`);

        if (bodyTexto.includes('Verifying you are human') || bodyTexto.includes('Cloudflare')) {
            bot.sendMessage(CHAT_ID, `⚠️ *Soccerway - Bloqueio Detectado:*\nStatus: ${status}\nO site exigiu verificação humana.`, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            bot.sendMessage(CHAT_ID, `✅ *Soccerway - Acesso Liberado!*\nStatus: ${status}\nTítulo: ${tituloPagina}`, { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(investigarEBurlarSoccerway, 3600000);
investigarEBurlarSoccerway();
