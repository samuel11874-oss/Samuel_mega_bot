const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Monitor de Partidas ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot US] Extraindo e filtrando partidas do Soccerway...");
        
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

        await new Promise(r => setTimeout(r, 5000));

        // Varredura cirúrgica descartando cabeçalhos de menu
        const partidas = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('a, div, li, tr');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                
                // Filtro para garantir que é uma linha de jogo e NÃO um botão do menu
                const ehMenu = txt.includes('FAVORITES') || txt.includes('PREMIER LEAGUE') || txt.includes('FULL-TIME | SCHEDULED');
                
                if (!ehMenu && txt.includes('\n') && txt.length > 12 && txt.length < 130) {
                    // Verifica se tem estrutura de jogo (placar ou tempo)
                    if (/\d+/.test(txt) && (txt.includes('|') || txt.includes('-') || txt.includes('Full-time') || txt.includes('After'))) {
                        const formatado = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0).join(' | ');
                        if (!resultados.includes(formatado)) {
                            resultados.push(formatado);
                        }
                    }
                }
            });

            return resultados;
        });

        console.log(`⚽ [Bot US] Jogos reais filtrados: ${partidas.length}`);

        if (partidas.length > 0) {
            let msg = `⚽ *PARTIDAS CAPTURADAS (${partidas.length})*\n\n`;
            partidas.slice(0, 15).forEach((p, i) => {
                msg += `📌 *${i + 1}:* ${p}\n\n`;
            });
            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo filtrado encontrado nesta rodada.*", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a verificação a cada 10 minutos
setInterval(buscarJogosAoVivo, 600000);
buscarJogosAoVivo();
