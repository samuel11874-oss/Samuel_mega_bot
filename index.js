const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Live V16 🔬</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarLiveV16() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V16] Iniciando extração cirúrgica e diagnóstico no TotalCorner...");
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1440,900'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1440, height: 900 });

        console.log("🌐 Acessando https://www.totalcorner.com/match/live ...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Aguarda a tabela com as partidas reais ser carregada
        console.log("⏳ Aguardando renderização dos elementos tr[id^='tr_match_']...");
        await page.waitForSelector('tr[id^="tr_match_"]', { timeout: 25000 }).catch(() => {
            console.log("⚠️ Seletor principal tr[id^='tr_match_'] não apareceu dentro do tempo limite.");
        });

        // Pausa de estabilização dos dados AJAX
        await new Promise(r => setTimeout(r, 4000));

        // DIAGNÓSTICO IMPRESSO NO LOG DO RENDER
        const diag = await page.evaluate(() => {
            const trs = document.querySelectorAll('tr[id^="tr_match_"]');
            const sampleText = trs.length > 0 ? trs[0].innerText.replace(/\s+/g, ' ') : 'Nenhum elemento encontrado';
            return {
                totalMatchRows: trs.length,
                sample: sampleText
            };
        });

        console.log(`📊 Partidas com ID detectadas no DOM: ${diag.totalMatchRows}`);
        if (diag.totalMatchRows > 0) {
            console.log(`📝 Amostra da 1ª linha lida: "${diag.sample.substring(0, 100)}..."`);
        }

        const resultados = await page.evaluate(() => {
            const lista = [];
            const trs = document.querySelectorAll('tr[id^="tr_match_"]');

            trs.forEach(tr => {
                // 1. TIMES
                const homeEl = tr.querySelector('.match_home a, .match_home, .home_name');
                const awayEl = tr.querySelector('.match_away a, .match_away, .away_name');

                if (!homeEl || !awayEl) return;

                let timeA = homeEl.innerText.trim().split('\n')[0];
                let timeB = awayEl.innerText.trim().split('\n')[0];

                if (!timeA || !timeB) return;

                // 2. MINUTO AO VIVO (Busca na classe específica .match_status_minutes ou .match_status)
                const statusMinEl = tr.querySelector('.match_status_minutes');
                const statusTd = tr.querySelector('.match_status');

                let minText = '';
                if (statusMinEl && statusMinEl.innerText.trim()) {
                    minText = statusMinEl.innerText.trim();
                } else if (statusTd && statusTd.innerText.trim()) {
                    minText = statusTd.innerText.trim();
                }

                // Descarte de partidas encerradas ou sem indicação de tempo
                if (!minText || /\b(FT|Fin|Canc|Postp)\b/i.test(minText)) {
                    return;
                }

                // Se o status for exclusivamente um horário futuro (ex: 15:30), pula
                if (/^\d{1,2}:\d{2}$/.test(minText)) {
                    return;
                }

                // Captura minutagem válida (ex: 89, 45+2, HT)
                let minMatch = minText.match(/(\d+\+?\d*|HT)/i);
                if (!minMatch) return;

                let tempoFormatado = minMatch[0].toUpperCase() === 'HT' ? 'HT' : `${minMatch[0]}'`;

                // 3. PLACAR
                const goalEl = tr.querySelector('.match_goal, .score');
                let placarText = goalEl ? goalEl.innerText.trim() : '0 - 0';
                let matchGols = placarText.match(/\d+\s*[-:]\s*\d+/);
                let placar = matchGols ? matchGols[0].replace(':', ' - ') : '0 - 0';

                // 4. ESCANTEIOS
                const cornerEl = tr.querySelector('.match_corner, .corner');
                let escanteiosText = cornerEl ? cornerEl.innerText.trim() : '0 - 0';
                if (escanteiosText.includes('.')) escanteiosText = '0 - 0';

                // 5. DADOS DE PRESSÃO
                const attachEl = tr.querySelector('.match_attach');
                const shotEl = tr.querySelector('.match_shot');
                const cardEl = tr.querySelector('.match_card');

                let ataqPerigosos = (attachEl && !attachEl.innerText.includes('.')) ? attachEl.innerText.trim() : 'S/D';
                let chutes = (shotEl && !shotEl.innerText.includes('.')) ? shotEl.innerText.trim() : 'S/D';
                let cartoes = (cardEl && !cardEl.innerText.includes('.')) ? cardEl.innerText.trim() : '0 - 0';

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    tempo: tempoFormatado,
                    placar: placar,
                    escanteios: escanteiosText,
                    ataquePerigoso: ataqPerigosos,
                    chutes: chutes,
                    cartoes: cartoes
                });
            });

            // Elimina duplicatas
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

        console.log(`⚽ [Bot V16] Partidas AO VIVO validadas e prontas: ${resultados.length}`);

        if (resultados.length > 0) {
            let enviados = 0;

            for (let i = 0; i < resultados.length; i++) {
                let p = resultados[i];
                enviados++;

                let tagPressao = "⚽ BOLA ROLANDO";
                let minNum = parseInt(p.tempo);
                if (!isNaN(minNum)) {
                    if (minNum >= 70) tagPressao = "🚨 RETA FINAL";
                    else if (minNum >= 35 && minNum <= 45) tagPressao = "🔥 RETA FINAL HT";
                }

                let card = `🛸 <b>[ RADAR TOTALCORNER // AO VIVO REAL ]</b> ⚡\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱️ <b>MINUTO REAL:</b> <code>[ ${p.tempo} ]</code> ${tagPressao}\n\n`;
                card += `⚽ <b>CONFRONTO:</b>\n`;
                card += `  🔹 <b>${p.timeA}</b>\n`;
                card += `  🔸 <b>${p.timeB}</b>\n\n`;
                card += `📊 <b>PLACAR REAL:</b> <code> ${p.placar} </code>\n`;
                card += `🚩 <b>ESCANTEIOS:</b>  <code> ${p.escanteios} </code>\n\n`;
                card += `🔥 <b>PRESSÃO AO VIVO:</b>\n`;
                card += `  💥 <b>Ataques Perigosos:</b> <code>${p.ataquePerigoso}</code>\n`;
                card += `  🎯 <b>Chutes no Gol:</b> <code>${p.chutes}</code>\n`;
                card += `  🟨 <b>Cartões:</b> <code>${p.cartoes}</code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Samuel Mega Bot • Precisão V16 (#${enviados})</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600)); 
            }

            console.log(`✅ ${enviados} cards de jogos ao vivo enviados com sucesso!`);
        } else {
            console.log("⚠️ Nenhuma partida ao vivo atendeu aos critérios neste ciclo.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V16:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos
setInterval(executarRadarLiveV16, 300000);
executarRadarLiveV16();
