const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Operacional ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot US] Extraindo partidas visíveis da tela...");
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        console.log("🌐 [Bot US] Acessando us.soccerway.com...");
        await page.goto('https://us.soccerway.com/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Aguarda 5 segundos para a lista de jogos renderizar completamente
        await new Promise(r => setTimeout(r, 5000));

        // Varredura cirúrgica nos blocos visíveis de partidas
        const partidas = await page.evaluate(() => {
            const resultados = [];
            
            // Pega todos os cartões e blocos de jogos da tela
            const blocos = document.querySelectorAll('a, div, li, tr');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                
                // Procura por textos que tenham nomes de times/placares (linhas com quebra de texto)
                if (txt.includes('\n') && txt.length > 10 && txt.length < 120) {
                    // Se contém números (placar) ou indicação de tempo/versus
                    if (/\d+/.test(txt) || txt.includes('FT') || txt.includes('AET') || txt.includes('-')) {
                        const formatado = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0).join(' | ');
                        if (!resultados.includes(formatado)) {
                            resultados.push(formatado);
                        }
                    }
                }
            });

            return resultados;
        });

        console.log(`⚽ [Bot US] Jogos/Placares mapeados: ${partidas.length}`);

        if (partidas.length > 0) {
            let msg = `🔴 *JOGOS CAPTURADOS NO SOCCERWAY (${partidas.length})*\n\n`;
            partidas.slice(0, 15).forEach((p, i) => {
                msg += `⚽ *${i + 1}:* ${p}\n\n`;
            });
            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum bloco de partida encontrado na extração.*", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(buscarJogosAoVivo, 600000);
buscarJogosAoVivo();
