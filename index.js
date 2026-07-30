const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Live V11 🎯</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarLiveV11() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V11] Varredura com precisão cirúrgica no TotalCorner Live...");
        
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

        console.log("⏳ Aguardando 8 segundos para renderização...");
        await new Promise(r => setTimeout(r, 8000));

        const resultados = await page.evaluate(() => {
            const lista = [];
            // Pega estritamente as linhas das partidas reais na versão desktop do TotalCorner
            const trs = document.querySelectorAll('tr[id^="tr_match_"]');

            trs.forEach(tr => {
                // 1. MINUTO DO JOGO (STATUS)
                const statusEl = tr.querySelector('.match_status_minutes, .match_status');
                let minuteRaw = statusEl ? statusEl.innerText.trim() : '';

                // Se for horário de jogo futuro (ex: 13:30, 20:30) ou jogo encerrado (FT), ignora
                if (!minuteRaw || /^\d{1,2}:\d{2}$/.test(minuteRaw) || /\b(FT|Fin|Canc|Postp)\b/i.test(minuteRaw)) {
                    return;
                }

                // Extrai o número do minuto (ex: 89, 67, 45+1) ou HT
                let minVal = minuteRaw.replace(/['"]/g, '').trim();
                let ehMinutoValido = !isNaN(parseInt(minVal)) || minVal.toLowerCase() === 'ht';

                if (!ehMinutoValido) return;

                let tempoFormatado = minVal.toLowerCase() === 'ht' ? 'HT' : `${minVal}'`;

                // 2. TIMES
                const homeEl = tr.querySelector('.match_home a, .match_home');
                const awayEl = tr.querySelector('.match_away a, .match_away');

                let timeA = homeEl ? homeEl.innerText.trim().split('\n')[0] : '';
                let timeB = awayEl ? awayEl.innerText.trim().split('\n')[0] : '';

                if (!timeA || !timeB) return;

                // 3. PLACAR DE GOLS
                const goalEl = tr.querySelector('.match_goal, .score');
                let placarText = goalEl ? goalEl.innerText.trim() : '0 - 0';
                if (placarText.toLowerCase() === 'vs') return; // Se for VS, não começou

                let matchP = placarText.match(/\d+\s*[-:]\s*\d+/);
                let placar = matchP ? matchP[0].replace(':', ' - ') : '0 - 0';

                // 4. ESCANTEIOS
                const cornerEl = tr.querySelector('.match_corner');
                let escanteios = cornerEl ? cornerEl.innerText.trim() : '0 - 0';

                // 5. ATAQUES PERIGOSOS / CHUTES / CARTÕES
                const attachEl = tr.querySelector('.match_attach');
                const shotEl = tr.querySelector('.match_shot');
                const cardEl = tr.querySelector('.match_card');

                let ataqPerigosos = attachEl ? attachEl.innerText.trim() : 'S/D';
                let chutes = shotEl ? shotEl.innerText.trim() : 'S/D';
                let cartoes = cardEl ? cardEl.innerText.trim() : '0 - 0';

                lista.push({
                    timeA: timeA,
                    timeB: timeB,
                    tempo: tempoFormatado,
                    placar: placar,
                    escanteios: escanteios,
                    ataquePerigoso: ataqPerigosos,
                    chutes: chutes,
                    cartoes: cartoes
                });
            });

            // Evita duplicatas
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

        console.log(`⚽ [Bot V11] Partidas AO VIVO identificadas com precisão: ${resultados.length}`);

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
                card += `🤖 <i>Samuel Mega Bot • Precisão V11 (#${enviados})</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600)); 
            }

            console.log(`✅ ${enviados} cards com dados reais foram enviados com sucesso!`);
        } else {
            console.log("⚠️ Nenhuma partida ao vivo ocorrendo no momento.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V11:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos
setInterval(executarRadarLiveV11, 300000);
executarRadarLiveV11();
