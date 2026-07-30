const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Total Live ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarLiveTotal() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V5.1] Capturando 100% dos jogos ao vivo com Placar e Minuto...");
        
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
            let linhas = document.querySelectorAll('tr[id^="tr_match_"]');
            
            if (linhas.length === 0) {
                linhas = document.querySelectorAll('table.match_table tbody tr, #home_page_corner tbody tr');
            }

            linhas.forEach(tr => {
                if (tr.querySelector('th') || tr.cells.length < 5) return;

                const textoLinha = tr.innerText || '';

                // 1. EXTRAÇÃO RÍGIDA DO CRONÔMETRO (MINUTO AO VIVO)
                const statusEl = tr.querySelector('.match_status_minutes, .match_status, .status, td:nth-child(3)');
                let tempoText = statusEl ? statusEl.innerText.trim() : '';

                let minutoLive = '';
                const matchMinuto = tempoText.match(/\d+['"]|\bHT\b|\b1st\b|\b2nd\b/i) || textoLinha.match(/\b(\d+['"]|\bHT\b)/i);
                
                if (matchMinuto) {
                    minutoLive = matchMinuto[0];
                } else if (tempoText && !tempoText.includes(':')) {
                    minutoLive = tempoText;
                } else {
                    minutoLive = 'AO VIVO';
                }

                // Descarta apenas se a partida estiver totalmente encerrada ou cancelada
                if (/\bFT\b/i.test(tempoText) || /\bCanc\b/i.test(tempoText)) {
                    return;
                }

                // 2. EXTRAÇÃO DOS TIMES
                const timeAEl = tr.querySelector('.match_home a, .match_home, .home_name, td:nth-child(4)');
                const timeBEl = tr.querySelector('.match_away a, .match_away, .away_name, td:nth-child(6)');
                let timeA = timeAEl ? timeAEl.innerText.trim() : '';
                let timeB = timeBEl ? timeBEl.innerText.trim() : '';

                // 3. EXTRAÇÃO DO PLACAR AO VIVO
                const golEl = tr.querySelector('.match_goal, .score, td:nth-child(5)');
                let placar = golEl ? golEl.innerText.trim() : '';

                if (!placar || placar.toLowerCase() === 'vs') {
                    const mPlacar = textoLinha.match(/(\d+\s*-\s*\d+)/);
                    if (mPlacar) placar = mPlacar[1];
                }

                if (!placar) placar = '0 - 0';

                // 4. ESCANTEIOS E ESTATÍSTICAS DE PRESSÃO
                const cornerEl = tr.querySelector('.match_corner, .corner, td:nth-child(7)');
                let escanteios = cornerEl ? cornerEl.innerText.trim() : '0 - 0';

                const daEl = tr.querySelector('.match_dangerous_attack, .match_attach');
                const shotEl = tr.querySelector('.match_shot');
                const cardEl = tr.querySelector('.match_card');
                const oddsEl = tr.querySelector('.match_handicap, .match_asian_corner');

                let ataqPerigosos = daEl ? daEl.innerText.trim() : 'S/D';
                let chutes = shotEl ? shotEl.innerText.trim() : 'S/D';
                let cartoes = cardEl ? cardEl.innerText.trim() : '0 - 0';
                let linha = oddsEl ? oddsEl.innerText.trim() : 'Over Asiático';

                // Tratamento de segurança para cartões
                if (cartoes) {
                    let partes = cartoes.split('-').map(n => parseInt(n.trim()));
                    if (partes.some(n => n > 15 || isNaN(n))) {
                        cartoes = '0 - 0';
                    }
                }

                if (timeA && timeB && timeA.length > 1) {
                    lista.push({
                        timeA: timeA.replace(/\n/g, ' '),
                        timeB: timeB.replace(/\n/g, ' '),
                        tempo: minutoLive,
                        placar: placar,
                        escanteios: escanteios,
                        ataquePerigoso: ataqPerigosos,
                        chutes: chutes,
                        cartoes: cartoes,
                        linha: linha
                    });
                }
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

        console.log(`⚽ [Bot V5.1] Encontradas ${resultados.length} partidas AO VIVO no momento.`);

        if (resultados.length > 0) {
            let enviados = 0;

            // ENVIA TODOS OS JOGOS CAPTURADOS (SEM LIMITE DE 20)
            for (let i = 0; i < resultados.length; i++) {
                let p = resultados[i];
                enviados++;

                let tagPressao = "⚽ AO VIVO";
                if (p.tempo.includes("'")) {
                    let min = parseInt(p.tempo);
                    if (min >= 70) tagPressao = "🚨 RETA FINAL";
                    else if (min >= 35 && min <= 45) tagPressao = "🔥 RETA FINAL HT";
                }

                let card = `🛸 <b>[ RADAR TOTALCORNER // LIVE ]</b> ⚡\n`;
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
                card += `🤖 <i>Samuel Mega Bot • Jogo #${enviados} de ${resultados.length}</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                // Delay curto para respeitar os limites do Telegram sem travar
                await new Promise(r => setTimeout(r, 600)); 
            }

            console.log(`✅ Todos os ${enviados} cards de jogos LIVE foram enviados ao Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida encontrada na verificação.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V5.1:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos
setInterval(executarRadarLiveTotal, 300000);
executarRadarLiveTotal();
