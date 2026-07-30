const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Live V13 🎯</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarLiveV13() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V13] Iniciando varredura científica no TotalCorner...");
        
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

        console.log("🌐 Acessando TotalCorner Live...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Rolagem de tela para forçar o carregamento do conteúdo dinâmico
        await page.evaluate(() => window.scrollBy(0, 400));
        await new Promise(r => setTimeout(r, 6000));

        const diagnostico = await page.evaluate(() => {
            const todasLinhas = document.querySelectorAll('tr');
            return { totalTr: todasLinhas.length };
        });

        console.log(`📊 Linhas de tabela detectadas no DOM: ${diagnostico.totalTr}`);

        const resultados = await page.evaluate(() => {
            const lista = [];
            const trs = document.querySelectorAll('tr');

            trs.forEach(tr => {
                const textLinha = tr.innerText || '';

                // 1. REJEIÇÃO CRÍTICA: Jogos futuros (horários como 14:30), datas ou jogos encerrados
                if (/\b\d{1,2}:\d{2}\b/.test(textLinha) || textLinha.includes('/') || /\b(FT|Fin|Canc|Postp)\b/i.test(textLinha)) {
                    return;
                }

                // 2. BUSCA DO MINUTO REAL
                const statusEl = tr.querySelector('.match_status_minutes, .match_status, td[class*="status"]');
                let minuteText = statusEl ? statusEl.innerText.trim() : '';

                // Validação de minuto: Deve ser um número (ex: 89, 67) ou HT
                let minMatch = minuteText.match(/\b\d+\b|\bHT\b/i);
                if (!minMatch) return;

                let minVal = minMatch[0];
                let tempoFormatado = minVal.toUpperCase() === 'HT' ? 'HT' : `${minVal}'`;

                // 3. IDENTIFICAÇÃO DOS TIMES
                const homeEl = tr.querySelector('.match_home a, .match_home, .home_name');
                const awayEl = tr.querySelector('.match_away a, .match_away, .away_name');

                let timeA = homeEl ? homeEl.innerText.trim().split('\n')[0] : '';
                let timeB = awayEl ? awayEl.innerText.trim().split('\n')[0] : '';

                if (!timeA || !timeB || timeA.length < 2 || timeB.length < 2) return;

                // 4. PLACAR DE GOLS (Apenas números inteiros)
                const goalEl = tr.querySelector('.match_goal, .score');
                let placarText = goalEl ? goalEl.innerText.trim() : '';
                let matchGols = placarText.match(/\b\d+\s*[-:]\s*\d+\b/);
                
                let placar = matchGols ? matchGols[0].replace(':', ' - ') : '0 - 0';

                // 5. ESCANTEIOS REAL (Filtra para bloquear odds que contêm ponto decimal)
                const cornerEl = tr.querySelector('.match_corner, .corner');
                let escanteiosText = cornerEl ? cornerEl.innerText.trim() : '0 - 0';
                
                if (escanteiosText.includes('.')) {
                    escanteiosText = '0 - 0';
                }

                // 6. DADOS DE PRESSÃO
                const attachEl = tr.querySelector('.match_attach');
                const shotEl = tr.querySelector('.match_shot');
                const cardEl = tr.querySelector('.match_card');

                let ataqPerigosos = attachEl && !attachEl.innerText.includes('.') ? attachEl.innerText.trim() : 'S/D';
                let chutes = shotEl && !shotEl.innerText.includes('.') ? shotEl.innerText.trim() : 'S/D';
                let cartoes = cardEl && !cardEl.innerText.includes('.') ? cardEl.innerText.trim() : '0 - 0';

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

        console.log(`⚽ [Bot V13] Partidas AO VIVO validadas com sucesso: ${resultados.length}`);

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
                card += `🤖 <i>Samuel Mega Bot • Precisão V13 (#${enviados})</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600)); 
            }

            console.log(`✅ ${enviados} cards de jogos reais enviados com sucesso!`);
        } else {
            console.log("⚠️ Nenhuma partida ao vivo em andamento encontrada neste ciclo.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V13:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos
setInterval(executarRadarLiveV13, 300000);
executarRadarLiveV13();
