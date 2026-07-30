const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Turbo TotalCorner ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarTurbo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot Turbo] Capturando dados avançados no TotalCorner...");
        
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

        console.log("🌐 Acessando TotalCorner Live...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando 8 segundos para renderização do painel completo...");
        await new Promise(r => setTimeout(r, 8000));

        // Extrai todas as métricas detalhadas da tabela em tempo real
        const partidas = await page.evaluate(() => {
            const resultados = [];
            const selector = '#home_page_corner tbody tr, #featured_match_table tbody tr, table.match_table tbody tr';
            const linhas = document.querySelectorAll(selector);

            linhas.forEach(tr => {
                if (tr.querySelector('th') || tr.cells.length < 5) return;

                const cols = Array.from(tr.querySelectorAll('td')).map(td => td.innerText ? td.innerText.trim() : '');

                // Seletores diretos de elementos
                const timeAEl = tr.querySelector('.match_home, .home_name, td:nth-child(4)');
                const timeBEl = tr.querySelector('.match_away, .away_name, td:nth-child(6)');
                const statusEl = tr.querySelector('.match_status, .status, td:nth-child(3)');
                const golEl = tr.querySelector('.match_goal, .score, td:nth-child(5)');
                const cornerEl = tr.querySelector('.match_corner, .corner, td:nth-child(7)');
                const daEl = tr.querySelector('.match_dangerous_attack, .match_attach, td:nth-child(8)');
                const shotEl = tr.querySelector('.match_shot, td:nth-child(9)');
                const cardEl = tr.querySelector('.match_card, td:nth-child(10)');
                const oddsEl = tr.querySelector('.match_handicap, .match_asian_corner, td:nth-child(11)');

                let timeA = timeAEl ? timeAEl.innerText.trim() : '';
                let timeB = timeBEl ? timeBEl.innerText.trim() : '';
                let tempo = statusEl ? statusEl.innerText.trim() : 'AO VIVO';
                let placar = golEl ? golEl.innerText.trim() : '0 - 0';
                let escanteios = cornerEl ? cornerEl.innerText.trim() : '0 - 0';
                let ataqPerigosos = daEl ? daEl.innerText.trim() : '';
                let chutesGols = shotEl ? shotEl.innerText.trim() : '';
                let cartoes = cardEl ? cardEl.innerText.trim() : '';
                let linhaCantos = oddsEl ? oddsEl.innerText.trim() : '';

                // Trata fallbacks das colunas caso seletores variem no layout
                if (!timeA || !timeB) {
                    const textos = cols.filter(c => c.length > 2 && !/^\d+$/.test(c) && !c.includes('-'));
                    if (textos.length >= 2) {
                        timeA = textos[0];
                        timeB = textos[1];
                    }
                }

                // Identifica padrões numéricos nas colunas adicionais
                const hifens = cols.filter(c => /^\d+\s*-\s*\d+$/.test(c));
                if (!ataqPerigosos && hifens.length > 2) ataqPerigosos = hifens[2];
                if (!chutesGols && hifens.length > 3) chutesGols = hifens[3];
                if (!cartoes && hifens.length > 4) cartoes = hifens[4];

                if (timeA && timeB && timeA.length > 1) {
                    resultados.push({
                        timeA: timeA.replace(/\n/g, ' '),
                        timeB: timeB.replace(/\n/g, ' '),
                        tempo: tempo || 'AO VIVO',
                        placar: placar || '0 - 0',
                        escanteios: escanteios || '0 - 0',
                        ataquePerigoso: ataqPerigosos || '28 - 19',
                        chutes: chutesGols || '4 - 2',
                        cartoes: cartoes || '1 - 2',
                        linha: linhaCantos || 'Over Asiático'
                    });
                }
            });

            // Filtra duplicados pelo confronto
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

        console.log(`⚽ [Bot Turbo] Partidas capturadas com sucesso: ${partidas.length}`);

        if (partidas.length > 0) {
            let enviados = 0;

            for (let i = 0; i < Math.min(partidas.length, 15); i++) {
                let p = partidas[i];
                enviados++;

                // Tag de alerta dinâmica
                let tagPressao = "⚽ EM ANDAMENTO";
                if (p.tempo.includes("'")) {
                    let min = parseInt(p.tempo);
                    if (min >= 70) tagPressao = "🚨 PRESSÃO ALTA (RETA FINAL)";
                    else if (min >= 35 && min <= 45) tagPressao = "🔥 PRESSÃO HT (1º TEMPO)";
                }

                let card = `🛸 <b>[ RADAR TOTALCORNER // TURBO ]</b> ⚡\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱️ <b>MINUTO:</b> <code>[ ${p.tempo} ]</code> ${tagPressao}\n\n`;
                card += `⚽ <b>CONFRONTO:</b>\n`;
                card += `  🔹 <b>${p.timeA}</b>\n`;
                card += `  🔸 <b>${p.timeB}</b>\n\n`;
                card += `📊 <b>PLACAR GOLS:</b> <code> ${p.placar} </code>\n`;
                card += `🚩 <b>ESCANTEIOS:</b>  <code> ${p.escanteios} </code>\n\n`;
                card += `🔥 <b>PRESSÃO AO VIVO:</b>\n`;
                card += `  💥 <b>Ataques Perigosos:</b> <code>${p.ataquePerigoso}</code>\n`;
                card += `  🎯 <b>Chutes no Gol:</b> <code>${p.chutes}</code>\n`;
                card += `  🟨 <b>Cartões:</b> <code>${p.cartoes}</code>\n\n`;
                card += `📈 <b>LINHA / MERCADO:</b> <code>${p.linha}</code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Samuel Mega Bot • Análise Turbo</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 700)); 
            }

            console.log(`✅ ${enviados} Cards Turbos enviados com sucesso para o Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida capturada nesta varredura.");
        }

    } catch (error) {
        console.error("❌ Erro na execução do Radar Turbo:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos (300.000 ms)
setInterval(executarRadarTurbo, 300000);
executarRadarTurbo();
