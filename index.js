const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Ao Vivo Real ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarAoVivoReal() {
    let browser = null;
    try {
        console.log("⚡ [Radar] Buscando apenas jogos em andamento real...");

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

        const jogosAoVivoReais = await page.evaluate(() => {
            const lista = [];
            const trs = document.querySelectorAll('tr');
            
            trs.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                
                // Critério rigoroso: Precisa ter "vs" E conter indicador de tempo ao vivo (ex: minutos com ' ou HT)
                // Jogos futuros mostram horário (ex: 21:30), jogos ao vivo mostram minutos (ex: 35', 70', HT)
                const temMinutoAoVivo = /\d+'|HT|1ºT|2ºT/i.test(texto);

                if (index > 0 && texto.includes('vs') && temMinutoAoVivo) {
                    lista.push(texto);
                }
            });
            return lista;
        });

        console.log(`📊 Jogos realmente AO VIVO capturados: ${jogosAoVivoReais.length}`);

        if (jogosAoVivoReais.length > 0) {
            let header = `🔴 <b>[RADAR TOTALCORNER - AO VIVO REAL]</b>\n🔥 Jogos rolando agora: <code>${jogosAoVivoReais.length}</code>\n\n`;
            await bot.sendMessage(CHAT_ID, header, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 0; i < Math.min(jogosAoVivoReais.length, 10); i++) {
                let card = `⚽ <b>AO VIVO #${i+1}</b>\n`;
                card += `📄 <code>${jogosAoVivoReais[i]}</code>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            console.log("ℹ️ Nenhum jogo realmente ao vivo no momento da varredura.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro no Radar:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarAoVivoReal();
setInterval(executarRadarAoVivoReal, 180000);
