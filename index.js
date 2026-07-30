const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar Ao Vivo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Memória para rastrear os placares anteriores e detectar gols
let historicoPlacares = {};

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot Pro] Varredura periódica de partidas ao vivo...");
        
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

        console.log("🌐 [Bot Pro] Acessando us.soccerway.com...");
        await page.goto('https://us.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 4000));
        
        try {
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, span, div'));
                const abaLive = links.find(el => el.innerText && el.innerText.trim() === 'LIVE');
                if (abaLive) abaLive.click();
            });
            await new Promise(r => setTimeout(r, 6000));
        } catch (e) {
            console.log("⚠️ Falha ao clicar na aba Live diretamente.");
        }

        const partidas = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('tr, div, li');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                if (!txt || txt.length < 15 || txt.length > 300) return;

                if (/Copyright|Soccerway|Sign up|Full-time|Finished|\bFT\b|ALL|SCHEDULED/i.test(txt)) return;

                const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                
                let indexMinuto = linhas.findIndex(l => /^\d{1,2}'?$/.test(l) || /^\d+\+\d+'?$/.test(l));
                if (indexMinuto === -1) return;

                let tempo = linhas[indexMinuto].replace("'", "") + "'";
                
                let limpos = linhas.filter(l => 
                    l !== linhas[indexMinuto] && 
                    !/^\d+$/.test(l) && 
                    !/^\d{2}:\d{2}$/.test(l) && 
                    l.length > 2
                );

                let numeros = linhas.filter(l => /^\d+$/.test(l) && l !== linhas[indexMinuto]);

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

            const unicas = [];
            const vistas = new Set();
            resultados.forEach(item => {
                const chave = `${item.timeA}x${item.timeB}`;
                if (!vistas.has(chave)) {
                    vistas.set(chave, item);
                    unicas.push(item);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot Pro] Partidas AO VIVO capturadas: ${partidas.length}`);

        if (partidas.length > 0) {
            let enviados = 0;
            let novoHistorico = {};

            for (let i = 0; i < Math.min(partidas.length, 25); i++) {
                let p = partidas[i];
                enviados++;

                let chaveJogo = `${p.timeA} x ${p.timeB}`;
                let statusGol = "⚡ <code>STATUS: ROLANDO</code>";

                // Verifica se o jogo já existia no ciclo anterior para detectar alteração no placar
                if (historicoPlacares[chaveJogo]) {
                    let anterior = historicoPlacares[chaveJogo];
                    if (p.golsA > anterior.golsA || p.golsB > anterior.golsB) {
                        statusGol = "GOOOOOOL! 🚨🔥 ⚽ <b>SAIU GOL RECENTE!</b>";
                    }
                }

                // Salva o estado atual para o próximo ciclo de 5 minutos
                novoHistorico[chaveJogo] = { golsA: p.golsA, golsB: p.golsB };

                let card = `🛸 <code>[ SYSTEM // LIVE_RADAR ]</code> ⚡\n`;
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

            // Atualiza a memória global de placares
            historicoPlacares = novoHistorico;

            console.log(`✅ ${enviados} cards enviados com detecção de gols ativada!`);
        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo ao vivo encontrado no momento.*", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

// Intervalo alterado para 5 minutos (300.000 milissegundos)
setInterval(buscarJogosAoVivo, 300000);
buscarJogosAoVivo();
