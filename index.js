const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Passo 3 TotalCorner ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function passo3TotalCorner() {
    let browser = null;
    try {
        console.log("🏁 [Passo 3] Iniciando varredura de linhas na página...");

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

        console.log("⏳ Aguardando os elementos da tabela carregarem...");
        await page.waitForSelector('tr', { timeout: 20000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 4000));

        // Extrai todas as linhas de texto encontradas nas tabelas
        const linhasEncontradas = await page.evaluate(() => {
            const lista = [];
            const trs = document.querySelectorAll('tr');
            trs.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                if (texto.length > 5) {
                    lista.push(`[${index}] ${texto}`);
                }
            });
            return lista;
        });

        console.log(`📊 Total de linhas capturadas: ${linhasEncontradas.length}`);

        let mensagem = `🏁 <b>[Passo 3]</b> Linhas capturadas: <code>${linhasEncontradas.length}</code>\n\n`;
        if (linhasEncontradas.length > 0) {
            // Mostra uma amostra das primeiras linhas no Telegram
            for (let i = 0; i < Math.min(5, linhasEncontradas.length); i++) {
                mensagem += `🔹 <code>${linhasEncontradas[i].substring(0, 100)}</code>\n`;
            }
        } else {
            mensagem += `❌ Nenhuma linha encontrada na tabela.`;
        }

        await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' });

    } catch (error) {
        console.error("❌ Erro no Passo 3:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro Passo 3:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Executa para validar
passo3TotalCorner();
