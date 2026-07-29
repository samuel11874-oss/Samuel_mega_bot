const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Monitor Ao Vivo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot US] Acessando e buscando jogos AO VIVO...");
        
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
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        // Aguarda a página carregar e tenta clicar na aba "LIVE" para filtrar os jogos do momento
        await new Promise(r => setTimeout(r, 4000));
        
        try {
            console.log("🔍 [Bot US] Procurando e clicando na aba 'LIVE'...");
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, span, div'));
                const abaLive = links.find(el => el.innerText && el.innerText.trim() === 'LIVE');
                if (abaLive) abaLive.click();
            });
            // Espera a listagem ao vivo carregar após o clique
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.log("⚠️ Não foi possível clicar na aba Live diretamente, seguindo com varredura geral.");
        }

        // Varredura focada em capturar placares, tempos de jogo e confrontos
        const partidas = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('tr, div, li');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                
                // Ignora menus e lixo
                const ehMenu = txt.includes('FAVORITES') || txt.includes('PREMIER LEAGUE') || txt.includes('LALIGA');
                
                if (!ehMenu && txt.includes('\n') && txt.length > 10 && txt.length < 140) {
                    // Procura por indicadores de partidas em andamento (minutos como 45', 78', ou placares com traço)
                    if ((txt.includes("'") || /\d+[\s-]+\d+/.test(txt)) && !resultados.includes(txt)) {
                        const formatado = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0).join(' | ');
                        if (formatado.length > 10 && !resultados.includes(formatado)) {
                            resultados.push(formatado);
                        }
                    }
                }
            });

            return resultados;
        });

        console.log(`⚽ [Bot US] Partidas ao vivo/recentes filtradas: ${partidas.length}`);

        if (partidas.length > 0) {
            let msg = `🔴 *JOGOS AO VIVO / RECENTES (${partidas.length})*\n\n`;
            partidas.slice(0, 15).forEach((p, i) => {
                msg += `⚽ *${i + 1}:* ${p}\n\n`;
            });
            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo ao vivo encontrado no momento da varredura.*", { parse_mode: 'Markdown' }).catch(()=>{});
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
