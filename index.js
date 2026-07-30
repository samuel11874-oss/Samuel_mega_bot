const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar TotalCorner API ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let historicoPlacares = {};

async function buscarJogosViaAPI() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot API] Iniciando escuta de rede no TotalCorner...");
        
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
        
        let listaPartidas = [];

        // Intercepta as respostas de rede para capturar os dados em JSON que o site carrega
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('match') || url.includes('data') || url.includes('live')) {
                try {
                    const contentType = response.headers()['content-type'] || '';
                    if (contentType.includes('application/json')) {
                        const json = await response.json();
                        if (json && Array.isArray(json.data)) {
                            listaPartidas = json.data;
                        } else if (json && Array.isArray(json)) {
                            listaPartidas = json;
                        }
                    }
                } catch (e) {}
            }
        });

        console.log("🌐 [Bot API] Acessando https://www.totalcorner.com/match/live ...");
        await page.goto('https://www.totalcorner.com/match/live', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando 10 segundos para captura de pacotes de dados...");
        await new Promise(r => setTimeout(r, 10000));

        // Se a interceptação por JSON direta não pegar tudo, faz um fallback para raspar os elementos da tabela renderizada
        if (listaPartidas.length === 0) {
            console.log("⚠️ [Bot API] Dados via JSON não capturados diretamente. Buscando elementos visuais renderizados...");
            listaPartidas = await page.evaluate(() => {
                const elements = document.querySelectorAll('.match-row, tr');
                const results = [];
                elements.forEach(el => {
                    const text = el.innerText ? el.innerText.trim() : '';
                    if (text.length > 10 && /\d+['"]/.test(text)) {
                        results.push({ textoBruto: text });
                    }
                });
                return results;
            });
        }

        console.log(`⚽ [Bot API] Total de registros capturados: ${listaPartidas.length}`);

        if (listaPartidas.length > 0) {
            let enviados = 0;
            let novoHistorico = {};

            for (let i = 0; i < Math.min(listaPartidas.length, 25); i++) {
                let item = listaPartidas[i];
                enviados++;

                let timeA = item.home_team_name || item.timeA || "Time Casa";
                let timeB = item.away_team_name || item.timeB || "Time Visitante";
                let tempo = item.minute || item.tempo || "AO VIVO";
                let golsA = item.home_score !== undefined ? item.home_score : (item.golsA || 0);
                let golsB = item.away_score !== undefined ? item.away_score : (item.golsB || 0);
                let placar = `${golsA} x ${golsB}`;

                if (item.textoBruto) {
                    timeA = "Partida Detectada";
                    timeB = "Ao Vivo";
                    placar = item.textoBruto.substring(0, 50);
                }

                let chaveJogo = `${timeA} x ${timeB}`;
                let statusGol = "⚡ <code>STATUS: ROLANDO</code>";

                if (historicoPlacares[chaveJogo]) {
                    let anterior = historicoPlacares[chaveJogo];
                    if (golsA > anterior.golsA || golsB > anterior.golsB) {
                        statusGol = "GOOOOOOL! 🚨🔥 ⚽ <b>SAIU GOL RECENTE!</b>";
                    }
                }

                novoHistorico[chaveJogo] = { golsA: golsA, golsB: golsB };

                let card = `🛸 <code>[ SYSTEM // TOTAL_CORNER ]</code> ⚡\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱  <b>TEMPO</b>  ➔  <code>[ ${tempo} ]</code>\n`;
                card += `⚽  <b>CONFRONTO</b>\n`;
                card += `    🔹 <b>${timeA}</b>\n`;
                card += `    🔸 <b>${timeB}</b>\n`;
                card += `📊  <b>PLACAR</b>  ➔  ⚡ <code> ${placar} </code> ⚡\n`;
                card += `──────────────────────\n`;
                card += `${statusGol}\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Radar Ativo - TotalCorner API</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600)); 
            }

            historicoPlacares = novoHistorico;
            console.log(`✅ ${enviados} cards enviados com sucesso!`);
        } else {
            console.log("⚠️ Nenhum registro retornado nesta varredura.");
        }

    } catch (error) {
        console.error("❌ Erro na varredura via API:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 5 minutos (300.000 ms)
setInterval(buscarJogosViaAPI, 300000);
buscarJogosViaAPI();
