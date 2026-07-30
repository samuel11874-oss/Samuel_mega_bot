const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Live Elite V4 ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarLiveElite() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot V4 Elite] Filtrando estritamente jogos masculinos profissionais AO VIVO...");
        
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

        console.log("⏳ Aguardando 8 segundos para renderização dos jogos...");
        await new Promise(r => setTimeout(r, 8000));

        const partidas = await page.evaluate(() => {
            const resultados = [];
            const selector = '#home_page_corner tbody tr, #featured_match_table tbody tr, table.match_table tbody tr';
            const linhas = document.querySelectorAll(selector);

            // RegEx para eliminar Feminino, Sub-X, Amador, Esports e Reservas
            const regexExcluir = /\b(Women|Women's|Fem|Feminino|\(W\)|U15|U17|U18|U19|U20|U21|U23|Sub[\s-]?15|Sub[\s-]?17|Sub[\s-]?18|Sub[\s-]?19|Sub[\s-]?20|Sub[\s-]?21|Sub[\s-]?23|Youth|Junior|Juniors|Reserve|Reserves|Amateur|Amador|Cyber|Esports|3x3|4x4|5x5|Short Football|SRL)\b/i;

            linhas.forEach(tr => {
                if (tr.querySelector('th') || tr.cells.length < 5) return;

                const textoLinha = tr.innerText || '';

                // 1. FILTRO DE LIGA/TIME: Se for Feminino, Base ou Amador -> DESCARTA
                if (regexExcluir.test(textoLinha)) {
                    return;
                }

                // 2. FILTRO DE HORÁRIO/STATUS (Apenas jogos LIVE)
                const statusEl = tr.querySelector('.match_status, .status, td:nth-child(3)');
                let tempoText = statusEl ? statusEl.innerText.trim() : '';

                // Se tiver data, horário (17:00), FT (encerrado) ou Canc -> DESCARTA
                if (/\d{2}\/\d{2}/.test(tempoText) || /\d{2}:\d{2}/.test(tempoText) || /^FT$/i.test(tempoText) || /^Canc/i.test(tempoText)) {
                    return;
                }

                // Valida se o minuto é realmente ao vivo (ex: 28', 45', HT, 88')
                const temMinutoLive = /\d+['"]|HT/i.test(tempoText) || /\d+['"]|HT/i.test(textoLinha);
                if (!temMinutoLive) {
                    return;
                }

                // 3. EXTRAÇÃO DOS TIMES
                const timeAEl = tr.querySelector('.match_home a, .match_home, .home_name, td:nth-child(4)');
                const timeBEl = tr.querySelector('.match_away a, .match_away, .away_name, td:nth-child(6)');
                let timeA = timeAEl ? timeAEl.innerText.trim() : '';
                let timeB = timeBEl ? timeBEl.innerText.trim() : '';

                // 4. EXTRAÇÃO DO PLACAR
                const golEl = tr.querySelector('.match_goal, .score, td:nth-child(5)');
                let placar = golEl ? golEl.innerText.trim() : '';

                if (!placar || placar.toLowerCase() === 'vs') {
                    const matchPlacar = textoLinha.match(/(\d+\s*-\s*\d+)/);
                    if (matchPlacar) placar = matchPlacar[1];
                }

                if (!placar || placar.toLowerCase() === 'vs' || !/\d/.test(placar)) {
                    return;
                }

                // 5. ESCANTEIOS E ESTATÍSTICAS
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

                // Trata inconsistência de cartões
                if (cartoes) {
                    let partes = cartoes.split('-').map(n => parseInt(n.trim()));
                    if (partes.some(n => n > 15 || isNaN(n))) {
                        cartoes = '0 - 0';
                    }
                }

                if (timeA && timeB && timeA.length > 1) {
                    resultados.push({
                        timeA: timeA.replace(/\n/g, ' '),
                        timeB: timeB.replace(/\n/g, ' '),
                        tempo: tempoText.includes("'") || tempoText === 'HT' ? tempoText : 'AO VIVO',
                        placar: placar,
                        escanteios: escanteios,
                        ataquePerigoso: ataqPerigosos,
                        chutes: chutes,
                        cartoes: cartoes,
                        linha: linha
                    });
                }
            });

            // Remove duplicatas
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

        console.log(`⚽ [Bot V4 Elite] Partidas LIVE PROFISSIONAIS encontradas: ${partidas.length}`);

        if (partidas.length > 0) {
            let enviados = 0;

            for (let i = 0; i < Math.min(partidas.length, 15); i++) {
                let p = partidas[i];
                enviados++;

                let tagPressao = "⚽ AO VIVO";
                if (p.tempo.includes("'")) {
                    let min = parseInt(p.tempo);
                    if (min >= 70) tagPressao = "🚨 PRESSÃO ALTA (RETA FINAL)";
                    else if (min >= 35 && min <= 45) tagPressao = "🔥 PRESSÃO HT (1º TEMPO)";
                }

                let card = `🛸 <b>[ RADAR TOTALCORNER // LIVE ]</b> ⚡\n`;
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
                card += `🤖 <i>Samuel Mega Bot • Apenas Principais Ligas Live</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 700)); 
            }

            console.log(`✅ ${enviados} cards de jogos LIVE profissionais enviados!`);
        } else {
            console.log("⚠️ Nenhum jogo masculino profissional em andamento atendeu aos filtros no momento.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V4 Elite:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 5 minutos
setInterval(executarRadarLiveElite, 300000);
executarRadarLiveElite();
