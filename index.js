const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Investigação Links Ao Vivo 🔍⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function investigarTotalCornerLinks() {
    let browser = null;
    try {
        console.log("🔍 [Investigação V52] Varrendo links diretos de partidas ao vivo...");

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

        console.log("⏳ Aguardando carregamento completo dos elementos dinâmicos...");
        await new Promise(r => setTimeout(r, 12000));

        // Coleta todos os links de partidas ao vivo na página
        const linksPartidas = await page.evaluate(() => {
            const resultados = [];
            const anchors = document.querySelectorAll('a');
            
            anchors.forEach(a => {
                const href = a.href || '';
                const texto = a.innerText.replace(/\s+/g, ' ').trim();
                
                // Filtra links que levam para a página de detalhe da partida ao vivo
                if ((href.includes('/live/') || href.includes('/match/')) && texto.length > 3) {
                    resultados.push({ href, texto });
                }
            });

            return resultados;
        });

        // Remove duplicatas baseadas no link (href)
        const unicos = Array.from(new Map(linksPartidas.map(item => [item.href, item])).values());

        console.log(`🔗 Links de partidas únicos encontrados: ${unicos.length}`);

        if (unicos.length > 0) {
            let msg = `🔍 <b>[INVESTIGAÇÃO - LINKS AO VIVO]</b>\n`;
            msg += `🔗 Total de links válidos: <code>${unicos.length}</code>\n\n`;
            
            await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 0; i < Math.min(unicos.length, 8); i++) {
                let card = `⚽ <a href="${unicos[i].href}">${unicos[i].texto}</a>\n`;
                card += `🔗 <code>${unicos[i].href}</code>\n\n`;
                
                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML', disable_web_page_preview: true }).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            console.log("ℹ️ Nenhum link de partida ao vivo encontrado na varredura.");
            await bot.sendMessage(CHAT_ID, `⚠️ <b>Aviso:</b> Nenhum link de partida detectado nesta varredura.`, { parse_mode: 'HTML' });
        }

    } catch (error) {
        console.error("❌ Erro na Investigação:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro Investigação:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

investigarTotalCornerLinks();
setInterval(investigarTotalCornerLinks, 180000);
