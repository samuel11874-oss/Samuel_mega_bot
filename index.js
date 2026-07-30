const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V53 Tabela Completa ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV53() {
    let browser = null;
    try {
        console.log("⚡ [Radar V53] Varrendo todas as linhas da tabela principal...");

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

        console.log("⏳ Aguardando carregamento completo da tabela...");
        await new Promise(r => setTimeout(r, 10000));

        // Extrai todas as linhas de tabela (tr) que contêm confrontos
        const jogosTabela = await page.evaluate(() => {
            const resultados = [];
            const linhas = document.querySelectorAll('tr');

            linhas.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                
                // Pega qualquer linha que possua confronto ("vs" ou "-") e tenha tamanho suficiente
                if (index > 0 && (texto.includes('vs') || texto.includes(' - ')) && texto.length > 12) {
                    resultados.push(texto);
                }
            });

            return resultados;
        });

        console.log(`📊 Partidas totais na tabela capturadas: ${jogosTabela.length}`);

        if (jogosTabela.length > 0) {
            let msg = `🔴 <b>[RADAR V53 - TABELA AO VIVO]</b>\n`;
            msg += `⚽ Total de jogos listados: <code>${jogosTabela.length}</code>\n\n`;
            
            await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 0; i < Math.min(jogosTabela.length, 8); i++) {
                let card = `⚽ <b>JOGO #${i+1}</b>\n`;
                card += `📄 <code>${jogosTabela[i]}</code>`;
                
                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            console.log("ℹ️ Nenhum jogo encontrado na tabela.");
            await bot.sendMessage(CHAT_ID, `⚠️ <b>Aviso:</b> Nenhum jogo detectado na tabela principal.`, { parse_mode: 'HTML' });
        }

    } catch (error) {
        console.error("❌ Erro V53:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V53:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV53();
setInterval(executarRadarV53, 180000);
