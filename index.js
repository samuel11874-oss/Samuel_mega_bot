const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Monitor Ao Vivo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot Ao Vivo] Acessando a página de jogos ao vivo no Soccerway...");
        
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
        await page.setViewport({ width: 1366, height: 2000 });

        const urlLive = 'https://us.soccerway.com/matches/live/';
        console.log(`🌐 [Bot Ao Vivo] URL: ${urlLive}`);

        await page.goto(urlLive, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização completa da página ao vivo...");
        await new Promise(r => setTimeout(r, 8000));

        const partidas = await page.evaluate(() => {
            const resultados = [];
            // Varre linhas de tabelas e blocos genéricos de partidas
            const elementos = document.querySelectorAll('tr, .match-row, div');

            elementos.forEach(el => {
                const txt = el.innerText ? el.innerText.trim() : '';
                if (!txt || txt.length < 8 || txt.length > 300) return;

                // Verifica se o texto contém indicativos de placar ou tempo de jogo
                const temPlacar = /\d+\s*-\s*\d+/.test(txt);
                const temTempo = /\d+'|HT|FT|Live/i.test(txt);

                if (temPlacar || temTempo) {
                    const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    let tempo = 'AO VIVO';
                    let placar = '0 x 0';
                    let timeA = '';
                    let timeB = '';

                    const linhaTempo = linhas.find(l => /^\d+'$|^HT$|^FT$/i.test(l));
                    const linhaPlacar = linhas.find(l => /^\d+\s*-\s*\d+$/.test(l));

                    if (linhaTempo) tempo = linhaTempo;
                    if (linhaPlacar) placar = linhaPlacar;

                    // Filtra linhas que não são os nomes dos times
                    const limpos = linhas.filter(l => 
                        l !== tempo && 
                        l !== placar && 
                        !/^\d+$/.test(l) && 
                        !/^\d{2}:\d{2}$/.test(l) &&
                        !/cup|league|championship|division|grupo/i.test(l) &&
                        l.length > 2
                    );

                    if (limpos.length >= 2) {
                        timeA = limpos[0];
                        timeB = limpos[1];
                    }

                    if (timeA && timeB && timeA !== timeB) {
                        resultados.push({
                            tempo: tempo,
                            timeA: timeA,
                            timeB: timeB,
                            placar: placar
                        });
                    }
                }
            });

            // Remove duplicatas
            const unicas = [];
            const vistas = new Set();
            resultados.forEach(m => {
                const chave = `${m.timeA}x${m.timeB}`;
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot Ao Vivo] Partidas ativas encontradas: ${partidas.length}`);

        if (partidas.length > 0) {
            let novosEnviados = 0;

            for (let i = 0; i < partidas.length; i++) {
                let p = partidas[i];
                novosEnviados++;

                let card = `⚡ *Partida Ao Vivo [${novosEnviados}]*\n`;
                card += `────────────────────\n`;
                card += `⏱ *Tempo:* \`${p.tempo}\`\n`;
                card += `⚽ **${p.timeA}** x **${p.timeB}**\n`;
                card += `📊 *Placar:* \` ${p.placar} \`\n`;
                card += `📐 *Status:* \`Monitorando ao vivo\`\n`;
                card += `────────────────────`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600));
            }

            console.log(`✅ [Bot Ao Vivo] ${novosEnviados} partidas enviadas para o Telegram.`);

        } else {
            console.log("⚠️ Nenhuma partida ao vivo no momento da varredura.");
        }

    } catch (error) {
        console.error("❌ Erro crítico no monitor ao vivo:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(buscarJogosAoVivo, 10 * 60 * 1000);
buscarJogosAoVivo();
