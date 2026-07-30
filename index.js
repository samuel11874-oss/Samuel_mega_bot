const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Diagnóstico Ao Vivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarDiagnostico() {
    let browser = null;
    try {
        console.log("⚡ [Radar Diagnóstico] Iniciando varredura profunda...");

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

        console.log("⏳ Aguardando 10 segundos para carregar todos os scripts dinâmicos de placar...");
        await new Promise(r => setTimeout(r, 10000));

        // Extrai todas as linhas e também procura por blocos específicos de partidas ao vivo
        const dadosPagina = await page.evaluate(() => {
            const linhas = [];
            const trs = document.querySelectorAll('tr');
            
            trs.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                if (texto.length > 5) {
                    linhas.push(texto);
                }
            });

            return {
                totalTrs: trs.length,
                amostraLinhas: linhas.slice(0, 15), // Pega as 15 primeiras linhas brutas
                htmlResumo: document.body.innerText.replace(/\s+/g, ' ').substring(0, 1000)
            };
        });

        console.log(`📊 Total de linhas (tr) na página: ${dadosPagina.totalTrs}`);

        let mensagem = `🔍 <b>[DIAGNÓSTICO AO VIVO]</b>\n`;
        mensagem += `📊 Total <code>tr</code>: <code>${dadosPagina.totalTrs}</code>\n\n`;
        
        if (dadosPagina.amostraLinhas.length > 0) {
            mensagem += `<b>Primeiras linhas encontradas:</b>\n`;
            for (let i = 0; i < Math.min(5, dadosPagina.amostraLinhas.length); i++) {
                mensagem += `🔹 <code>${dadosPagina.amostraLinhas[i].substring(0, 100)}</code>\n`;
            }
        } else {
            mensagem += `❌ Nenhuma linha capturada.`;
        }

        await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' });

    } catch (error) {
        console.error("❌ Erro no Diagnóstico:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro Diagnóstico:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarDiagnostico();
setInterval(executarRadarDiagnostico, 180000);
