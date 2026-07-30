const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V54 Aba Ao Vivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV54() {
    let browser = null;
    try {
        console.log("⚡ [Radar V54] Acessando e filtrando aba ao vivo real...");

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

        console.log("⏳ Aguardando carregamento da página...");
        await new Promise(r => setTimeout(r, 8000));

        // Tenta clicar em filtros de "Ao Vivo" caso existam na página
        await page.evaluate(() => {
            const botoes = document.querySelectorAll('a, button, span');
            botoes.forEach(el => {
                if (el.innerText.toLowerCase().includes('ao vivo') || el.innerText.toLowerCase().includes('live')) {
                    el.click();
                }
            });
        }).catch(() => {});

        await new Promise(r => setTimeout(r, 4000));

        // Extrai apenas as linhas que contêm placar ou minutos em andamento
        const jogosReaisAoVivo = await page.evaluate(() => {
            const resultados = [];
            const linhas = document.querySelectorAll('tr');

            linhas.forEach((tr) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                
                // Critério estrito: Deve ter confronto ("vs") E conter marcação de tempo/minuto (ex: 15', 45', HT, 2ºT)
                const temTempoReal = /\d+'|HT|1ºT|2ºT/i.test(texto);
                const temConfronto = texto.includes('vs') || texto.includes(' - ');

                if (temConfronto && temTempoReal && texto.length > 15) {
                    resultados.push(texto);
                }
            });

            return resultados;
        });

        console.log(`📊 Jogos realmente AO VIVO filtrados: ${jogosReaisAoVivo.length}`);

        if (jogosReaisAoVivo.length > 0) {
            let msg = `🔴 <b>[RADAR V54 - AO VIVO REAL]</b>\n`;
            msg += `🔥 Jogos rolando agora: <code>${jogosReaisAoVivo.length}</code>\n\n`;
            
            await bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 0; i < Math.min(jogosReaisAoVivo.length, 8); i++) {
                let card = `⚽ <b>AO VIVO #${i+1}</b>\n`;
                card += `📄 <code>${jogosReaisAoVivo[i]}</code>`;
                
                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            console.log("ℹ️ Nenhum jogo com minuto ao vivo detectado nesta varredura.");
            await bot.sendMessage(CHAT_ID, `⚠️ <b>Aviso:</b> Nenhum jogo com minuto ao vivo detectado no momento.`, { parse_mode: 'HTML' });
        }

    } catch (error) {
        console.error("❌ Erro V54:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V54:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV54();
setInterval(executarRadarV54, 180000);
