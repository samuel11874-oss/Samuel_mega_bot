const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V45 Diagnóstico 🕵️‍♂️</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV45() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V45 - DIAGNÓSTICO] Iniciando...");

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

        console.log("🌐 Acessando https://www.totalcorner.com/match/live ...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log("⏳ Aguardando 10 segundos para carregar o AJAX do ao vivo...");
        await new Promise(r => setTimeout(r, 10000));

        const diagnosticoTexto = await page.evaluate(() => {
            return {
                titulo: document.title,
                corpoResumo: document.body.innerText.replace(/\s+/g, ' ').substring(0, 800),
                totalTrs: document.querySelectorAll('tr').length,
                totalTds: document.querySelectorAll('td').length
            };
        });

        console.log("🔍 [DIAGNÓSTICO DA PÁGINA NA NUVEM]:");
        console.log(`- Título da Página: ${diagnosticoTexto.titulo}`);
        console.log(`- Total de linhas (tr): ${diagnosticoTexto.totalTrs}`);
        console.log(`- Total de colunas (td): ${diagnosticoTexto.totalTds}`);
        console.log(`- Amostra do Conteúdo: "${diagnosticoTexto.corpoResumo}"`);

        const dadosAoVivo = await page.evaluate(() => {
            const resultados = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                
                if (teamLinks.length >= 2) {
                    resultados.push({
                        timeA: teamLinks[0].innerText.trim(),
                        timeB: teamLinks[1].innerText.trim(),
                        textoLinha: texto
                    });
                }
            });

            return resultados;
        });

        console.log(`⚡ [Bot V45] Total de partidas encontradas: ${dadosAoVivo.length}`);

        let msg = `🕵️‍♂️ <b>[DIAGNÓSTICO V45]</b>\n`;
        msg += `📊 Linhas (tr): <code>${diagnosticoTexto.totalTrs}</code>\n`;
        msg += `⚽ Jogos Encontrados: <code>${dadosAoVivo.length}</code>\n`;
        msg += `📄 <code>${diagnosticoTexto.corpoResumo.substring(0, 200)}</code>`;
        await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});

    } catch (error) {
        console.error("❌ Erro V45:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V45:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 3 minutos
setInterval(executarRadarV45, 180000);
executarRadarV45();
