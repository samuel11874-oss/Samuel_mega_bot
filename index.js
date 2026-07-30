const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar TotalCorner Ativo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarTotalCorner() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot TC] Varrendo partidas ao vivo no TotalCorner...");
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process',
                '--window-size=1366,768'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        console.log("🌐 Acessando TotalCorner...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando 7 segundos para carregamento das tabelas...");
        await new Promise(r => setTimeout(r, 7000));

        // Extrai e estrutura individualmente cada dado da partida
        const partidas = await page.evaluate(() => {
            const resultados = [];
            const selector = '#home_page_corner tbody tr, #featured_match_table tbody tr, table.match_table tbody tr';
            const linhas = document.querySelectorAll(selector);

            linhas.forEach(tr => {
                if (tr.querySelector('th') || tr.cells.length < 5) return;

                const cols = Array.from(tr.querySelectorAll('td')).map(td => td.innerText ? td.innerText.trim() : '');

                // Busca elementos específicos por seletores ou posição
                const timeAEl = tr.querySelector('.match_home, .home_name, td:nth-child(4)');
                const timeBEl = tr.querySelector('.match_away, .away_name, td:nth-child(6)');
                const statusEl = tr.querySelector('.match_status, .status, td:nth-child(3)');
                const golEl = tr.querySelector('.match_goal, .score, td:nth-child(5)');
                const cornerEl = tr.querySelector('.match_corner, .corner, td:nth-child(7)');

                let timeA = timeAEl ? timeAEl.innerText.trim() : '';
                let timeB = timeBEl ? timeBEl.innerText.trim() : '';
                let tempo = statusEl ? statusEl.innerText.trim() : '';
                let placar = golEl ? golEl.innerText.trim() : '';
                let escanteios = cornerEl ? cornerEl.innerText.trim() : '';

                // Fallbacks inteligentes usando o array de colunas se o DOM for variável
                if (!timeA || !timeB) {
                    const textos = cols.filter(c => c.length > 2 && !/^\d+$/.test(c) && !c.includes('-'));
                    if (textos.length >= 2) {
                        timeA = textos[0];
                        timeB = textos[1];
                    }
                }

                if (!tempo) {
                    tempo = cols.find(c => /^\d{1,2}'$/.test(c) || c === 'HT') || 'AO VIVO';
                }

                const comHifen = cols.filter(c => /^\d+\s*-\s*\d+$/.test(c));
                if (comHifen.length > 0 && !placar) placar = comHifen[0];
                if (comHifen.length > 1 && !escanteios) escanteios = comHifen[1];

                if (timeA && timeB && timeA.length > 1) {
                    resultados.push({
                        timeA: timeA.replace(/\n/g, ' '),
                        timeB: timeB.replace(/\n/g, ' '),
                        tempo: tempo || 'AO VIVO',
                        placar: placar || '0 - 0',
                        escanteios: escanteios || '0 - 0'
                    });
                }
            });

            // Remove duplicados por nome do confronto
            const unicos = [];
            const vistos = new Set();
            resultados.forEach(item => {
                const chave = `${item.timeA} x ${item.timeB}`;
                if (!vistos.has(chave)) {
                    vistos.add(chave);
                    unicos.push(item);
                }
            });

            return unicos;
        });

        console.log(`⚽ [Bot TC] Partidas capturadas e filtradas: ${partidas.length}`);

        if (partidas.length > 0) {
            let enviados = 0;

            // Envia até 20 cards formatados para o Telegram
            for (let i = 0; i < Math.min(partidas.length, 20); i++) {
                let p = partidas[i];
                enviados++;

                let card = `🛸 <b>[ RADAR TOTALCORNER ]</b> ⚡\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱️ <b>MINUTO:</b> <code>[ ${p.tempo} ]</code>\n\n`;
                card += `⚽ <b>CONFRONTO:</b>\n`;
                card += `  🔹 <b>${p.timeA}</b>\n`;
                card += `  🔸 <b>${p.timeB}</b>\n\n`;
                card += `📊 <b>PLACAR GOLS:</b> <code> ${p.placar} </code>\n`;
                card += `🚩 <b>ESCANTEIOS:</b> <code> ${p.escanteios} </code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Samuel Mega Bot • Ao Vivo</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600)); 
            }

            console.log(`✅ ${enviados} cards modernos enviados para o Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida ao vivo no momento.");
        }

    } catch (error) {
        console.error("❌ Erro na execução:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos (300.000 ms)
setInterval(executarRadarTotalCorner, 300000);
executarRadarTotalCorner();
