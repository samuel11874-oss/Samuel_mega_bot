const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V44 Ao Vivo Direto ⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV44() {
    let browser = null;
    try {
        console.log("⚡ [Bot V44] Acessando diretamente /match/live com espera de rede...");

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

        console.log("⏳ Aguardando renderização completa da tabela ao vivo...");
        // Garante tempo hábil para o script interno do site injetar os dados na tabela
        await new Promise(r => setTimeout(r, 7000));

        const dadosAoVivo = await page.evaluate(() => {
            const resultados = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                
                // Procura por linhas que tenham links de equipes (/team/)
                const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                if (teamLinks.length >= 2) {
                    const timeA = teamLinks[0].innerText.trim();
                    const timeB = teamLinks[1].innerText.trim();

                    resultados.push({
                        timeA,
                        timeB,
                        textoLinha: texto
                    });
                }
            });

            return resultados;
        });

        console.log(`⚡ [Bot V44] Total de partidas encontradas na página ao vivo: ${dadosAoVivo.length}`);

        if (dadosAoVivo.length > 0) {
            let msg = `⚡ <b>[RADAR V44 - AO VIVO]</b>\n🔥 Partidas detectadas: <code>${dadosAoVivo.length}</code>\n\n`;
            await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 0; i < Math.min(dadosAoVivo.length, 10); i++) {
                const j = dadosAoVivo[i];
                let card = `⚽ <b>JOGO #${i+1}</b>\n`;
                card += `🏠 <b>${j.timeA}</b> vs ✈️ <b>${j.timeB}</b>\n`;
                card += `📄 <code>${j.textoLinha.substring(0, 150)}</code>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            console.log("ℹ️ Nenhum jogo retornado na listagem ao vivo neste momento.");
            await bot.sendMessage(CHAT_ID, `ℹ️ <b>[V44 Ao Vivo]</b> 0 partidas ativas listadas no DOM no momento da varredura.`, { parse_mode: 'HTML' }).catch(() => {});
        }

    } catch (error) {
        console.error("❌ Erro V44:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V44:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 3 minutos
setInterval(executarRadarV44, 180000);
executarRadarV44();
