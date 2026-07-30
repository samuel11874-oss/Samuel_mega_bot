const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Modo Investigação TotalCorner 🔍⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function investigarTotalCorner() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [INVESTIGAÇÃO] Iniciando varredura de auditoria no TotalCorner...");
        
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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        console.log("🌐 [INVESTIGAÇÃO] Acessando https://www.totalcorner.com/match/today ...");
        await page.goto('https://www.totalcorner.com/match/today', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando 8 segundos para renderização total da página...");
        await new Promise(r => setTimeout(r, 8000));

        // 1. Tira um print para sabermos exatamente o que o servidor está vendo
        const caminhoPrint = path.join(__dirname, 'screenshot.png');
        await page.screenshot({ path: caminhoPrint, fullPage: true });
        console.log("📸 [INVESTIGAÇÃO] Print de tela salvo com sucesso no servidor!");

        // 2. Extrai e exibe no log do Render todo o texto bruto encontrado nas tabelas ou divs principais
        const dadosBrutos = await page.evaluate(() => {
            const elementos = document.querySelectorAll('tr, .match-row, div');
            const amostras = [];
            
            elementos.forEach((el, index) => {
                const txt = el.innerText ? el.innerText.trim() : '';
                // Pega textos que tenham tamanho útil de partidas
                if (txt.length > 20 && txt.length < 400 && index < 30) {
                    amostras.push(txt);
                }
            });
            return amostras;
        });

        console.log("📊 [INVESTIGAÇÃO] Amostras de texto encontradas na página:");
        console.log(JSON.stringify(dadosBrutos, null, 2));

        bot.sendMessage(CHAT_ID, "🔍 *[Modo Investigação]* O bot analisou o TotalCorner. Veja os logs no Render para inspecionar os dados coletados!", { parse_mode: 'Markdown' }).catch(()=>{});

    } catch (error) {
        console.error("❌ Erro na investigação:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro na Investigação:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 10 minutos durante a fase de testes e investigação
setInterval(investigarTotalCorner, 600000);
investigarTotalCorner();
