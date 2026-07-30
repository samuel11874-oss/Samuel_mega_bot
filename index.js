const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V19 🎯</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV19() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V19] Iniciando busca por Cards e Tabelas no TotalCorner PT...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1366,768'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

        console.log("🌐 Acessando TotalCorner Hoje/Ao Vivo...");
        const response = await page.goto('https://www.totalcorner.com/pt/match/today', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log(`📡 Status HTTP: ${response ? response.status() : 0}`);

        // Rola a página para forçar o carregamento de todos os cards
        await page.evaluate(() => window.scrollBy(0, 500));
        await new Promise(r => setTimeout(r, 6000));

        const partidasAoVivo = await page.evaluate(() => {
            const lista = [];

            // Captura tanto elementos de tabela quanto blocos/cards de partidas
            const blocos = document.querySelectorAll('tr[id^="tr_match_"], div[class*="match_"], .row[id^="match_"]');

            // Caso o layout seja em cards div genéricos
            const todosElementos = blocos.length > 0 ? blocos : document.querySelectorAll('div, tr');

            todosElementos.forEach(el => {
                const texto = el.innerText || '';

                // Verifica se o bloco contém indicadores de jogo ao vivo (Ex: "Mín" ou minutos ativos)
                if (!texto.includes('Mín') && !/\b\d{1,2}'\b/.test(texto) && !/\bHT\b/.test(texto)) {
                    return;
                }

                // Captura o minuto (busca números no trecho do Mín)
                let minMatch = texto.match(/Mín\s*(\d+)/i) || texto.match(/\b(\d{1,2})\b/);
                if (!minMatch) return;

                let minuto = minMatch[1];
                let minNum = parseInt(minuto);
                if (isNaN(minNum) || minNum <= 0 || minNum > 100) return;

                // Captura de Times
                const links = el.querySelectorAll('a');
                let times = [];
                links.forEach(a => {
                    let name = a.innerText.trim();
                    if (name.length > 2 && !/^(Estatísticas|Cotas|Ao vivo|Stats|Odds|App)$/i.test(name)) {
                        times.push(name);
                    }
                });

                if (times.length < 2) return;

                let timeA = times[0];
                let timeB = times[1];

                // Captura do Placar (Ex: 0 - 1 ou 1 - 0)
                let placarMatch = texto.match(/\b(\d+\s*[-:]\s*\d+)\b/);
                let placar = placarMatch ? placarMatch[1].replace(':', ' - ') : '0 - 0';

                // Captura de Escanteios (Ex: 3 - 2)
                let escanteiosMatch = texto.match(/Escanteios\s*(\d+\s*-\s*\d+)/i) || texto.match(/(\d+\s*-\s*\d+)\s*\(\d+-\d+\)/);
                let escanteios = escanteiosMatch ? escanteiosMatch[1] : '0 - 0';

                // Captura de Perigo/Ataques
                let perigoMatch = texto.match(/Perigo\s*(\d+\s*-\s*\d+)/i);
                let perigo = perigoMatch ? perigoMatch[1] : 'S/D';

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    tempo: `${minuto}'`,
                    placar: placar,
                    escanteios: escanteios,
                    perigo: perigo
                });
            });

            // Remove duplicatas
            const unicos = [];
            const vistos = new Set();
            lista.forEach(item => {
                const chave = `${item.timeA} x ${item.timeB}`;
                if (!vistos.has(chave)) {
                    vistos.add(chave);
                    unicos.push(item);
                }
            });

            return unicos;
        });

        console.log(`⚽ [Bot V19] Partidas AO VIVO encontradas nos Cards: ${partidasAoVivo.length}`);

        if (partidasAoVivo.length > 0) {
            let enviados = 0;

            for (let i = 0; i < partidasAoVivo.length; i++) {
                let p = partidasAoVivo[i];
                enviados++;

                let card = `🛸 <b>[ RADAR TOTALCORNER // AO VIVO ]</b> ⚡\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱️ <b>MINUTO REAL:</b> <code>[ ${p.tempo} ]</code>\n\n`;
                card += `⚽ <b>CONFRONTO:</b>\n`;
                card += `  🔹 <b>${p.timeA}</b>\n`;
                card += `  🔸 <b>${p.timeB}</b>\n\n`;
                card += `📊 <b>PLACAR REAL:</b> <code> ${p.placar} </code>\n`;
                card += `🚩 <b>ESCANTEIOS:</b>  <code> ${p.escanteios} </code>\n`;
                card += `💥 <b>Ataques Perigosos:</b> <code> ${p.perigo} </code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Samuel Mega Bot • Precisão V19 (#${enviados})</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 600));
            }

            console.log(`✅ ${enviados} partidas enviadas para o Telegram com sucesso!`);
        } else {
            console.log("⚠️ Nenhum card com minuto ao vivo foi identificado nesta rodada.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V19:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos
setInterval(executarRadarV19, 300000);
executarRadarV19();
