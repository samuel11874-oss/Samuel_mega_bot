const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Passo 4 TotalCorner ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function passo4TotalCorner() {
    let browser = null;
    try {
        console.log("🏁 [Passo 4] Coletando e filtrando partidas do TotalCorner...");

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

        console.log("⏳ Aguardando os dados carregarem...");
        await page.waitForSelector('tr', { timeout: 20000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 4000));

        // Extrai e filtra as linhas da tabela
        const partidas = await page.evaluate(() => {
            const lista = [];
            const trs = document.querySelectorAll('tr');
            
            trs.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                // Ignora o cabeçalho e linhas muito curtas
                if (index > 0 && texto.includes('vs') && texto.length > 10) {
                    lista.push(texto);
                }
            });
            return lista;
        });

        console.log(`📊 Partidas válidas encontradas: ${partidas.length}`);

        let mensagem = `⚡ <b>[RADAR TOTALCORNER - PASSO 4]</b>\n`;
        mensagem += `⚽ Jogos encontrados: <code>${partidas.length}</code>\n\n`;

        if (partidas.length > 0) {
            // Exibe até 5 jogos limpos no Telegram
            for (let i = 0; i < Math.min(5, partidas.length); i++) {
                mensagem += `🔹 <code>${partidas[i]}</code>\n\n`;
            }
        } else {
            mensagem += `❌ Nenhuma partida válida localizada no momento.`;
        }

        await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' });

    } catch (error) {
        console.error("❌ Erro no Passo 4:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro Passo 4:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Executa para validar
passo4TotalCorner();
