const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V51 Ao Vivo Dinâmico ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV51() {
    let browser = null;
    try {
        console.log("⚡ [Radar V51] Iniciando extração dinâmica...");

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

        console.log("⏳ Aguardando 12 segundos para estabilizar os dados dinâmicos do AJAX...");
        await new Promise(r => setTimeout(r, 12000));

        // Rola a página para baixo para forçar carregamento de elementos preguiçosos (lazy load)
        await page.evaluate(() => {
            window.scrollBy(0, document.body.scrollHeight);
        });
        await new Promise(r => setTimeout(r, 3000));

        // Varredura cirúrgica procurando por partidas ativas
        const jogosAoVivo = await page.evaluate(() => {
            const resultados = [];
            const linhas = document.querySelectorAll('tr');

            linhas.forEach((tr) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                
                // Procura por indicadores claros de jogo rolando (minutos com ' ou HT ou placar estruturado)
                const temAndamento = /\d+'|HT|1ºT|2ºT/i.test(texto);
                const temTimes = texto.includes('vs') || texto.includes('-');

                if (temAndamento && temTimes && texto.length > 15) {
                    resultados.push(texto);
                }
            });

            return resultados;
        });

        console.log(`📊 Partidas dinâmicas ao vivo capturadas: ${jogosAoVivo.length}`);

        if (jogosAoVivo.length > 0) {
            let msg = `🔴 <b>[RADAR V51 - AO VIVO DINÂMICO]</b>\n`;
            msg += `🔥 Jogos capturados: <code>${jogosAoVivo.length}</code>\n\n`;
            
            await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 0; i < Math.min(jogosAoVivo.length, 8); i++) {
                let card = `⚽ <b>JOGO AO VIVO #${i+1}</b>\n`;
                card += `📄 <code>${jogosAoVivo[i]}</code>`;
                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            console.log("ℹ️ Nenhum jogo com marcação de tempo ao vivo encontrado nesta varredura.");
        }

    } catch (error) {
        console.error("❌ Erro V51:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V51:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV51();
setInterval(executarRadarV51, 180000);
