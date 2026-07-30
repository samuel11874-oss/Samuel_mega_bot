const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Live Real V9 ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarLiveV9() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V9] Coletando partidas REALMENTE AO VIVO no TotalCorner...");
        
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

        console.log("⏳ Aguardando 8 segundos para renderização dos dados ao vivo...");
        await new Promise(r => setTimeout(r, 8000));

        const resultados = await page.evaluate(() => {
            const lista = [];
            
            // SELEÇÃO ESTRITA: Seleciona APENAS linhas de partidas reais do TotalCorner
            const linhasPartidas = document.querySelectorAll('tr[id^="tr_match_"], tr.match_row');

            linhasPartidas.forEach(tr => {
                // 1. TIME CASA E TIME FORA
                const homeEl = tr.querySelector('.match_home a, .match_home, .home_name');
                const awayEl = tr.querySelector('.match_away a, .match_away, .away_name');

                let timeA = homeEl ? homeEl.innerText.trim().split('\n')[0] : '';
                let timeB = awayEl ? awayEl.innerText.trim().split('\n')[0] : '';

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) return;

                // 2. TEMPO / MINUTO AO VIVO
                const statusMinutesEl = tr.querySelector('.match_status_minutes, .match_status');
                let statusText = statusMinutesEl ? statusMinutesEl.innerText.trim() : '';

                // Procura min como "25'", "45+2'", "HT"
                const matchMinuto = statusText.match(/\b\d+['"]|\bHT\b|\b1st\b|\b2nd\b/i) || tr.innerText.match(/\b(\d+['"]|\bHT\b)/i);
                
                // Se o jogo não tiver minuto ao vivo (ex: for pré-jogo "14:00" ou encerrado "FT"), ignora
                if (!matchMinuto || /\b(FT|Fin|Canc|Postp)\b/i.test(statusText)) {
                    return;
                }

                let tempoLive = matchMinuto[0];

                // 3. PLACAR DE GOLS AO VIVO
                const golEl = tr.querySelector('.match_goal, .score');
                let placarText = golEl ? golEl.innerText.trim() : '';

                // Extrai o formato de gols (ex: "1 - 0" ou "2-2")
                let placarValido = placarText.match(/(\d+\s*[-:]\s*\d+)/);
                let placar = placarValido ? placarValido[1].replace(':', ' - ') : '0 - 0';

                // 4. ESCANTEIOS AO VIVO
                const cornerEl = tr.querySelector('.match_corner, .corner');
                let escanteios = cornerEl ? cornerEl.innerText.trim() : '0 - 0';

                // 5. ATAQUES PERIGOSOS, CHUTES E CARTÕES
                const daEl = tr.querySelector('.match_attach, .match_dangerous_attack');
                const shotEl = tr.querySelector('.match_shot');
                const cardEl = tr.querySelector('.match_card');
                const oddsEl = tr.querySelector('.match_handicap, .match_asian_corner');

                let ataqPerigosos = daEl ? daEl.innerText.trim() : 'S/D';
                let chutes = shotEl ? shotEl.innerText.trim() : 'S/D';
                let cartoes = cardEl ? cardEl.innerText.trim() : '0 - 0';
                let linha = oddsEl ? oddsEl.innerText.trim() : 'Over Asiático';

                // Limpeza de formato de cartões
                if (cartoes) {
                    let partes = cartoes.split('-').map(n => parseInt(n.trim()));
                    if (partes.some(n => n > 20 || isNaN(n))) cartoes = '0 - 0';
                }

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    tempo: tempoLive,
                    placar: placar,
                    escanteios: escanteios,
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

        console.log(`⚽ [Bot V9] Partidas com dados reais AO VIVO validadas: ${resultados.length}`);

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
                card += `⏱️ <b>MINUTO REAL:</b> <code>[ ${p.tempo} ]</code> ${tagPressao}\n\n`;
                card += `⚽ <b>CONFRONTO:</b>\n`;
                card += `  🔹 <b>${p.timeA}</b>\n`;
                card += `  🔸 <b>${p.timeB}</b>\n\n`;
                card += `📊 <b>PLACAR REAL:</b> <code> ${p.placar} </code>\n`;
                card += `🚩 <b>ESCANTEIOS:</b>  <code> ${p.escanteios} </code>\n\n`;
                card += `🔥 <b>PRESSÃO AO VIVO:</b>\n`;
                card += `  💥 <b>Ataques Perigosos:</b> <code>${p.ataquePerigoso}</code>\n`;
                card += `  🎯 <b>Chutes no Gol:</b> <code>${p.chutes}</code>\n`;
                card += `  🟨 <b>Cartões:</b> <code>${p.cartoes}</code>\n\n`;
                card += `📈 <b>LINHA / MERCADO:</b> <code>${p.linha}</code>\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Samuel Mega Bot • Coleta Precisa V9 (#${enviados})</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600)); 
            }

            console.log(`✅ ${enviados} cards de jogos em tempo real enviados com sucesso!`);
        } else {
            console.log("⚠️ Nenhuma partida com bola rolando encontrada no momento.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V9:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos
setInterval(executarRadarLiveV9, 300000);
executarRadarLiveV9();
