const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V55 Estruturado ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV55() {
    let browser = null;
    try {
        console.log("⚡ [Radar V55] Mapeando colunas da tabela ao vivo...");

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

        console.log("⏳ Aguardando renderização completa...");
        await new Promise(r => setTimeout(r, 10000));

        // Extrai linha por linha mapeando as colunas (td)
        const dadosEstruturados = await page.evaluate(() => {
            const lista = [];
            const trs = document.querySelectorAll('tr');

            trs.forEach((tr, index) => {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 3) {
                    const colunas = Array.from(tds).map(td => td.innerText.replace(/\s+/g, ' ').trim());
                    lista.push({
                        linhaIndex: index,
                        colunas: colunas
                    });
                }
            });

            return lista;
        });

        console.log(`📊 Linhas com colunas estruturadas encontradas: ${dadosEstruturados.length}`);

        if (dadosEstruturados.length > 0) {
            let msg = `📊 <b>[RADAR V55 - ESTRUTURADO]</b>\n`;
            msg += `Total de linhas com colunas: <code>${dadosEstruturados.length}</code>\n\n`;
            
            await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            // Envia uma amostra das primeiras linhas detalhando o conteúdo de cada coluna
            for (let i = 0; i < Math.min(dadosEstruturados.length, 5); i++) {
                const item = dadosEstruturados[i];
                let card = `⚽ <b>Linha #${item.linhaIndex}</b>\n`;
                card += `📄 <code>${item.colunas.join(' | ')}</code>`;
                
                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            console.log("ℹ️ Nenhuma estrutura de colunas detectada.");
            await bot.sendMessage(CHAT_ID, `⚠️ <b>Aviso:</b> Nenhuma estrutura de colunas detectada.`, { parse_mode: 'HTML' });
        }

    } catch (error) {
        console.error("❌ Erro V55:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V55:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV55();
setInterval(executarRadarV55, 180000);
