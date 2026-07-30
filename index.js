const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar TotalCorner Ativo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let historicoPlacares = {};

async function buscarJogosTotalCorner() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot TC] Varrendo partidas no TotalCorner...");
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        console.log("🌐 [Bot TC] Acessando https://www.totalcorner.com/match/today ...");
        await page.goto('https://www.totalcorner.com/match/today', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando 7 segundos para carregamento das tabelas de jogos...");
        await new Promise(r => setTimeout(r, 7000));

        const partidas = await page.evaluate(() => {
            const resultados = [];
            // O TotalCorner organiza as partidas em linhas de tabela (tr)
            const linhas = document.querySelectorAll('tr');

            linhas.forEach(tr => {
                const txt = tr.innerText ? tr.innerText.trim() : '';
                if (!txt || txt.length < 15) return;

                // Ignora cabeçalhos e partidas finalizadas
                if (/Finished|FT|Schedule|Corner Line|Sort by/i.test(txt)) return;

                const colunas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                
                // Procura por indicativo de tempo ao vivo (ex: 45', 78', 45+2')
                let indexTempo = colunas.findIndex(l => /^\d{1,2}'$/.test(l) || /^\d{1,2}\+?\d*'$/.test(l) || l === 'HT');
                if (indexTempo === -1) return;

                let tempo = colunas[indexTempo];

                // Extrai textos limpos (times) e números (placar)
                let limpos = colunas.filter(l => 
                    l !== tempo && 
                    !/^\d+$/.test(l) && 
                    !l.includes('%') && 
                    !l.includes('-') &&
                    l.length > 2
                );

                let numeros = colunas.filter(l => /^\d+$/.test(l) && l !== tempo);

                // Se encontrou ao menos dois blocos de texto (times) e números de placar válidos
                if (limpos.length >= 2 && numeros.length >= 2) {
                    resultados.push({
                        tempo: tempo,
                        timeA: limpos[0],
                        timeB: limpos[1],
                        placar: `${numeros[0]} x ${numeros[1]}`,
                        golsA: parseInt(numeros[0]),
                        golsB: parseInt(numeros[1])
                    });
                }
            });

            // Remove duplicatas baseadas no confronto
            const unicas = [];
            const vistas = new Set();
            resultados.forEach(item => {
                const chave = `${item.timeA}x${item.timeB}`;
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(item);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot TC] Partidas capturadas com sucesso: ${partidas.length}`);

        if (partidas.length > 0) {
            let enviados = 0;
            let novoHistorico = {};

            for (let i = 0; i < Math.min(partidas.length, 25); i++) {
                let p = partidas[i];
                enviados++;

                let chaveJogo = `${p.timeA} x ${p.timeB}`;
                let statusGol = "⚡ <code>STATUS: ROLANDO</code>";

                if (historicoPlacares[chaveJogo]) {
                    let anterior = historicoPlacares[chaveJogo];
                    if (p.golsA > anterior.golsA || p.golsB > anterior.golsB) {
                        statusGol = "GOOOOOOL! 🚨🔥 ⚽ <b>SAIU GOL RECENTE!</b>";
                    }
                }

                novoHistorico[chaveJogo] = { golsA: p.golsA, golsB: p.golsB };

                let card = `🛸 <code>[ SYSTEM // TOTAL_CORNER ]</code> ⚡\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱  <b>TEMPO</b>  ➔  <code>[ ${p.tempo} ]</code>\n`;
                card += `⚽  <b>CONFRONTO</b>\n`;
                card += `    🔹 <b>${p.timeA}</b>\n`;
                card += `    🔸 <b>${p.timeB}</b>\n`;
                card += `📊  <b>PLACAR</b>  ➔  ⚡ <code> ${p.placar} </code> ⚡\n`;
                card += `──────────────────────\n`;
                card += `${statusGol}\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Radar Ativo - Atualização 5m</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600)); 
            }

            historicoPlacares = novoHistorico;
            console.log(`✅ ${enviados} cards enviados para o Telegram com sucesso!`);
        } else {
            console.log("⚠️ Nenhum jogo ao vivo localizado nas linhas da tabela nesta varredura.");
        }

    } catch (error) {
        console.error("❌ Erro na varredura:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 5 minutos (300.000 ms)
setInterval(buscarJogosTotalCorner, 300000);
buscarJogosTotalCorner();
