const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Cards Organizados ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarCards() {
    let browser = null;
    try {
        console.log("⚡ [Radar Cards] Coletando e formatando partidas...");

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

        console.log("⏳ Aguardando carregamento e rolando a página...");
        await new Promise(r => setTimeout(r, 6000));

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        const dadosPartidas = await page.evaluate(() => {
            const aoVivoSet = new Set();
            const outrosSet = new Set();
            const trs = document.querySelectorAll('tr');

            trs.forEach((tr, index) => {
                const texto = tr.innerText.replace(/\s+/g, ' ').trim();
                
                if (index > 0 && (texto.includes('vs') || texto.includes(' - ')) && texto.length > 10) {
                    // Detecta se tem minuto ou indicador de andamento (ex: 15', 45', HT, 90', 2ºT)
                    const matchTempo = texto.match(/(\d+'|HT|1ºT|2ºT|Intervalo)/i);

                    if (matchTempo) {
                        aoVivoSet.add(texto);
                    } else {
                        outrosSet.add(texto);
                    }
                }
            });

            return {
                aoVivo: Array.from(aoVivoSet),
                outros: Array.from(outrosSet)
            };
        });

        console.log(`🔴 Ao Vivo detectados: ${dadosPartidas.aoVivo.length}`);
        console.log(`📅 Outros jogos: ${dadosPartidas.outros.length}`);

        let mensagem = `⚽ <b>RADAR TOTALCORNER - AO VIVO</b> ⚽\n\n`;

        if (dadosPartidas.aoVivo.length > 0) {
            mensagem += `🔴 <b>EM ANDAMENTO (${dadosPartidas.aoVivo.length}):</b>\n\n`;
            let c = 1;
            for (const jogo of dadosPartidas.aoVivo) {
                // Tenta extrair o tempo para destacar de forma limpa no card
                const match = jogo.match(/(\d+'|HT|1ºT|2ºT|Intervalo)/i);
                const tempoInfo = match ? `⏱ [${match[0]}]` : `⏱ [AO VIVO]`;

                mensagem += `🟢 <b>#${c} ${tempoInfo}</b>\n`;
                mensagem += `<code>${jogo}</code>\n\n`;
                c++;
            }
        } else {
            mensagem += `⚠️ <i>Nenhum jogo com tempo real no momento.</i>\n\n`;
        }

        if (dadosPartidas.outros.length > 0) {
            mensagem += `━━━━━━━━━━━━━━━━━━━━━\n`;
            mensagem += `📋 <b>OUTROS JOGOS NA LISTA (${dadosPartidas.outros.length}):</b>\n\n`;
            let c = 1;
            for (const jogo of dadosPartidas.outros) {
                mensagem += `⏳ <b>#${c}</b> <code>${jogo}</code>\n\n`;
                c++;
            }
        }

        // Envio seguro dividido por blocos se necessário
        if (mensagem.length > 3900) {
            await bot.sendMessage(CHAT_ID, mensagem.substring(0, 3800), { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));
            await bot.sendMessage(CHAT_ID, `<b>[Continuação do Radar]</b>\n\n` + mensagem.substring(3800), { parse_mode: 'HTML' }).catch(() => {});
        } else {
            await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' }).catch(() => {});
        }

        console.log("✅ Cards organizados enviados com sucesso!");

    } catch (error) {
        console.error("❌ Erro:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarCards();
setInterval(executarRadarCards, 180000);
