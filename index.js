const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V46 Bruto ⚡</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarBrutoV46() {
    let browser = null;
    try {
        console.log("⚡ [Bot V46 - BRUTO] Iniciando varredura...");

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

        console.log("🌐 Acessando https://www.totalcorner.com/match/today ...");
        await page.goto('https://www.totalcorner.com/match/today', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 4000));

        // Tenta encontrar e clicar na aba/botão "Live" ou "In-Play" na tela
        console.log("🖱️ Procurando e clicando na aba 'Live'...");
        const clicou = await page.evaluate(() => {
            const elementos = Array.from(document.querySelectorAll('a, button, span, li, div'));
            for (const el of elementos) {
                const txt = el.innerText.trim().toLowerCase();
                if (txt === 'live' || txt === 'in-play' || txt === 'ao vivo') {
                    el.click();
                    return true;
                }
            }
            return false;
        });

        console.log(`🖱️ Botão Live clicado com sucesso? ${clicou}`);

        if (clicou) {
            console.log("⏳ Aguardando 8 segundos para a tabela ao vivo carregar...");
            await new Promise(r => setTimeout(r, 8000));
        }

        // Extração Bruta: pega todas as linhas da tabela da página atual sem filtros restritos
        const linhasBrutas = await page.evaluate(() => {
            const resultados = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                if (texto.length > 5) {
                    resultados.push({
                        id: index,
                        linha: texto
                    });
                }
            });

            return resultados;
        });

        console.log(`📊 Total de linhas brutas encontradas: ${linhasBrutas.length}`);

        // Envia um resumo direto para o Telegram
        let msg = `⚡ <b>[RADAR V46 - INVESTIGAÇÃO BRUTA]</b>\n`;
        msg += `📊 Linhas capturadas: <code>${linhasBrutas.length}</code>\n\n`;

        if (linhasBrutas.length > 0) {
            // Mostra as primeiras 5 linhas brutas para análise imediata
            for (let i = 0; i < Math.min(5, linhasBrutas.length); i++) {
                msg += `🔹 <code>${linhasBrutas[i].linha.substring(0, 120)}</code>\n`;
            }
        } else {
            msg += `❌ Nenhuma linha encontrada.`;
        }

        await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});

    } catch (error) {
        console.error("❌ Erro V46:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V46:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 3 minutos
setInterval(executarRadarBrutoV46, 180000);
executarRadarBrutoV46();
