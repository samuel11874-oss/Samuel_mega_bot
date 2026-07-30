const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Live Real V10 ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarLiveV10() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V10] Varredura ultra-filtrada de partidas AO VIVO...");
        
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

        console.log("⏳ Aguardando 8 segundos para renderização correta dos dados...");
        await new Promise(r => setTimeout(r, 8000));

        const resultados = await page.evaluate(() => {
            const lista = [];
            const linhasPartidas = document.querySelectorAll('tr[id^="tr_match_"], tr.match_row');

            linhasPartidas.forEach(tr => {
                const textoCompleto = tr.innerText || '';

                // TRAVA 1: Se houver barra "/" na linha ou data, é jogo futuro/separado -> Ignorar
                if (textoCompleto.includes('/') && !textoCompleto.includes("'")) return;

                // 1. TIMES
                const homeEl = tr.querySelector('.match_home a, .match_home, .home_name');
                const awayEl = tr.querySelector('.match_away a, .match_away, .away_name');

                let timeA = homeEl ? homeEl.innerText.trim().split('\n')[0] : '';
                let timeB = awayEl ? awayEl.innerText.trim().split('\n')[0] : '';

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) return;

                // 2. TEMPO / MINUTO AO VIVO REAL
                const statusMinutesEl = tr.querySelector('.match_status_minutes, .match_status');
                let statusText = statusMinutesEl ? statusMinutesEl.innerText.trim() : '';

                // O minuto PRECISA ter o apóstrofo (') ou ser HT/1st/2nd. Se tiver formato de data/hora (ex: 20:30), rejeita.
                const temMinutoReal = /\d+['"]|\bHT\b|\b1st\b|\b2nd\b/i.test(statusText);
                if (!temMinutoReal || statusText.includes('/') || /^\d{2}:\d{2}$/.test(statusText)) {
                    return;
                }

                let tempoLive = statusText.match(/\d+['"]?|\bHT\b/i)[0];
                if (!tempoLive.includes("'") && tempoLive.toLowerCase() !== 'ht') {
                    tempoLive += "'";
                }

                // 3. PLACAR DE GOLS (Estritamente números inteiros, sem pontos de odds)
                const golEl = tr.querySelector('.match_goal, .score');
                let placarText = golEl ? golEl.innerText.trim() : '';
                let matchPlacar = placarText.match(/(\d+\s*[-:]\s*\d+)/);
                
                if (!matchPlacar) return; // Se não achar placar em números inteiros, descarta
                let placar = matchPlacar[1].replace(':', ' -');

                // 4. ESCANTEIOS (Validação para rejeitar odds com ponto decimal)
                const cornerEl = tr.querySelector('.match_corner, .corner');
                let escanteiosText = cornerEl ? cornerEl.innerText.trim() : '0 - 0';
                
                // Se contiver ponto decimal (ex: 1.70), não são escanteios reais
                if (escanteiosText.includes('.')) {
                    escanteiosText = '0 - 0';
                }

                // 5. ESTATÍSTICAS ADICIONAIS
                const daEl = tr.querySelector('.match_attach, .match_dangerous_attack');
                const shotEl = tr.querySelector('.match_shot');
                const cardEl = tr.querySelector('.match_card');
                const oddsEl = tr.querySelector('.match_handicap, .match_asian_corner');

                let ataqPerigosos = daEl ? daEl.innerText.trim() : '0';
                if (ataqPerigosos.includes('.')) ataqPerigosos = '0';

                let chutes = shotEl ? shotEl.innerText.trim() : '0';
                if (chutes.includes('.')) chutes = '0';

                let cartoes = cardEl ? cardEl.innerText.trim() : '0 - 0';
                if (cartoes.includes('.')) cartoes = '0 - 0';

                let linha = oddsEl ? oddsEl.innerText.trim() : 'Over Asiático';

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    tempo: tempoLive,
                    placar: placar,
                    escanteios: escanteiosText,
                    ataquePerigoso: ataqPerigosos,
                    chutes: chutes,
                    cartoes: cartoes,
                    linha: linha
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

        console.log(`⚽ [Bot V10] Partidas 100% reais validadas: ${resultados.length}`);

        if (resultados.length > 0) {
            let enviados = 0;

            for (let i = 0; i < resultados.length; i++) {
                let p = resultados[i];
                enviados++;

                let tagPressao = "⚽ BOLA ROLANDO";
                let minLimpo = parseInt(p.tempo);
                if (!isNaN(minLimpo)) {
                    if (minLimpo >= 70) tagPressao = "🚨 RETA FINAL";
                    else if (minLimpo >= 35 && minLimpo <= 45) tagPressao = "🔥 RETA FINAL HT";
                }

                let card = `🛸 <b>[ RADAR TOTALCORNER // AO VIVO REAL ]</b> ⚡\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱️ <b>MINUTO REAL:</b> <code>[ ${p.tempo} ]</code> ${tagPressao}\n\n`;
                card += `⚽ <b>CONFRONTO:</b>\n`;
                card += `  🔹 <b>${p.timeA}</b>\n`;
                card += `  🔸 <b>${p.timeB}</b>\n\n`;
                card += `📊 <b>PLACAR GOLS:</b> <code> ${p.placar} </code>\n`;
                card += `🚩 <b>ESCANTEIOS:</b>  <code> ${p.escanteios} </code>\n\n`;
                card += `🔥 <b>PRESSÃO AO VIVO:</b>\n`;
                card += `  💥 <b>Ataques Perigosos:</b> <code>${p.ataquePerigoso}</code>\n`;
                card += `  🎯 <b>Chutes no Gol:</b> <code>${p.chutes}</code>\n`;
                card += `  🟨 <b>Cartões:</b> <code>${p.cartoes}</code>\n\n`;
                card += `📈 <b>MERCADO / LINHA:</b> <code>${p.linha}</code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Samuel Mega Bot • Filtro Real V10 (#${enviados})</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600)); 
            }

            console.log(`✅ ${enviados} cards de jogos reais enviados ao Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida com minutos reais em Andamento no momento.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V10:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos
setInterval(executarRadarLiveV10, 300000);
executarRadarLiveV10();
