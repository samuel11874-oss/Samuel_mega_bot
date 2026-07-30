const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Live V8 Infalível ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarLiveV8() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V8] Iniciando varredura infalível no TotalCorner...");
        
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

        console.log("⏳ Aguardando 8 segundos para renderização dos dados...");
        await new Promise(r => setTimeout(r, 8000));

        const resultados = await page.evaluate(() => {
            const lista = [];
            const trs = document.querySelectorAll('tr');

            trs.forEach(tr => {
                if (tr.querySelector('th') || tr.cells.length < 5) return;

                const textoLinha = (tr.innerText || '').trim();

                // 1. EXTRAÇÃO DO STATUS/TEMPO
                const statusEl = tr.querySelector('.match_status, .match_status_minutes, .status') || tr.cells[2];
                let tempoText = statusEl ? statusEl.innerText.trim() : '';

                // 2. EXTRAÇÃO DOS TIMES
                const homeEl = tr.querySelector('.match_home') || tr.cells[3];
                const awayEl = tr.querySelector('.match_away') || tr.cells[5];

                let timeA = homeEl ? homeEl.innerText.trim() : '';
                let timeB = awayEl ? awayEl.innerText.trim() : '';

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) return;

                timeA = timeA.split('\n')[0].trim();
                timeB = timeB.split('\n')[0].trim();

                // 3. EXTRAÇÃO DO PLACAR
                const golEl = tr.querySelector('.match_goal, .score') || tr.cells[4];
                let placarText = golEl ? golEl.innerText.trim() : '';

                // 4. FILTROS DE PRÉ-JOGO E ENCERRADOS
                if (/\b(FT|Fin|Finished|Canc|Postp)\b/i.test(tempoText) || /\bFT\b/i.test(textoLinha)) {
                    return; // Descarta jogos encerrados
                }

                // Descarta apenas horários futuros no formato de relógio puro (ex: "13:00", "14:30")
                const ehHorarioFuturo = /^\d{1,2}:\d{2}$/.test(tempoText);
                if (ehHorarioFuturo) {
                    return;
                }

                const ehVS = placarText.toLowerCase() === 'vs' || placarText === '';
                const temMinutoRodando = tempoText.includes("'") || /\b(HT|1st|2nd|\d+)\b/i.test(tempoText);

                if (ehVS && !temMinutoRodando) {
                    return;
                }

                // 5. FORMATAÇÃO FINAL DE PLACAR E TEMPO
                let placar = placarText;
                if (!placar || placar.toLowerCase() === 'vs') {
                    const matchP = textoLinha.match(/(\d+\s*[-:]\s*\d+)/);
                    placar = matchP ? matchP[1].replace(':', '-') : '0 - 0';
                }

                let tempo = tempoText || 'AO VIVO';
                if (!tempo.includes("'") && !isNaN(tempo) && tempo !== '') {
                    tempo = `${tempo}'`;
                }

                // 6. ESCANTEIOS E ESTATÍSTICAS
                const cornerEl = tr.querySelector('.match_corner') || tr.cells[6];
                let escanteios = cornerEl ? cornerEl.innerText.trim() : '0 - 0';

                const daEl = tr.querySelector('.match_dangerous_attack, .match_attach');
                const shotEl = tr.querySelector('.match_shot');
                const cardEl = tr.querySelector('.match_card');
                const oddsEl = tr.querySelector('.match_handicap, .match_asian_corner');

                let ataqPerigosos = daEl ? daEl.innerText.trim() : 'S/D';
                let chutes = shotEl ? shotEl.innerText.trim() : 'S/D';
                let cartoes = cardEl ? cardEl.innerText.trim() : '0 - 0';
                let linha = oddsEl ? oddsEl.innerText.trim() : 'Over Asiático';

                if (cartoes) {
                    let partes = cartoes.split('-').map(n => parseInt(n.trim()));
                    if (partes.some(n => n > 20 || isNaN(n))) cartoes = '0 - 0';
                }

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    tempo: tempo,
                    placar: placar,
                    escanteios: escanteios,
                    ataquePerigoso: ataqPerigosos,
                    chutes: chutes,
                    cartoes: cartoes,
                    linha: linha
                });
            });

            // Remove duplicatas por confronto
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

        console.log(`⚽ [Bot V8] Partidas AO VIVO identificadas: ${resultados.length}`);

        if (resultados.length > 0) {
            let enviados = 0;
            for (let i = 0; i < resultados.length; i++) {
                let p = resultados[i];
                enviados++;

                let tagPressao = "⚽ BOLA ROLANDO";
                if (p.tempo.includes("'")) {
                    let min = parseInt(p.tempo);
                    if (min >= 70) tagPressao = "🚨 RETA FINAL";
                    else if (min >= 35 && min <= 45) tagPressao = "🔥 RETA FINAL HT";
                }

                let card = `🛸 <b>[ RADAR TOTALCORNER // LIVE REAL ]</b> ⚡\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱️ <b>MINUTO AO VIVO:</b> <code>[ ${p.tempo} ]</code> ${tagPressao}\n\n`;
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
                card += `🤖 <i>Samuel Mega Bot • Jogo Live #${enviados} de ${resultados.length}</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600)); 
            }
            console.log(`✅ ${enviados} cards de jogos em andamento foram enviados ao Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida ao vivo no momento.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V8:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos
setInterval(executarRadarLiveV8, 300000);
executarRadarLiveV8();
