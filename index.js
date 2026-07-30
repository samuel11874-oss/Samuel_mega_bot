const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Monitor Ao Vivo Mobile ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let jogosEnviadosSet = new Set();

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot Ao Vivo Mobile] Acessando Soccerway no modo mobile...");
        
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
        
        // Configura user-agent e viewport de celular para forçar o layout mobile correto
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

        const urlLive = 'https://us.soccerway.com/matches/live/';
        console.log(`🌐 [Bot Ao Vivo Mobile] URL: ${urlLive}`);

        await page.goto(urlLive, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização dos jogos ao vivo...");
        await new Promise(r => setTimeout(r, 8000));

        const partidas = await page.evaluate(() => {
            const resultados = [];
            let ligaAtual = 'AO VIVO';

            // Seleciona todos os blocos de linhas/itens da versão mobile
            const blocos = document.querySelectorAll('tr, div, li');

            blocos.forEach(el => {
                const txt = el.innerText ? el.innerText.trim() : '';
                if (!txt || txt.length < 5 || txt.length > 300) return;

                // Detecta se é cabeçalho de liga/competição na versão mobile
                if (el.className.includes('competition') || el.className.includes('group') || el.className.includes('header') || (el.querySelector('img') && txt.length < 50 && !txt.includes("'"))) {
                    if (txt.length < 60) {
                        ligaAtual = txt.replace(/\n/g, ' - ');
                    }
                    return;
                }

                // Identifica se a linha possui tempo de jogo (ex: 79', HT, FT) ou placar (ex: 4 - 2)
                const temTempo = /\d+'|HT|FT/i.test(txt);
                const temPlacar = /\d+\s*-\s*\d+/.test(txt);

                if (temTempo || temPlacar) {
                    const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                    let tempo = 'AO VIVO';
                    let placar = '0 x 0';
                    const nomesTimes = [];

                    linhas.forEach(l => {
                        if (/^\d+'$|^HT$|^FT$/i.test(l)) {
                            tempo = l;
                        } else if (/^\d+\s*-\s*\d+$/.test(l)) {
                            placar = l;
                        } else if (l.length > 2 && !/^\d+$/.test(l) && !/usa|brazil|argentina|mexico/i.test(l)) {
                            nomesTimes.push(l);
                        }
                    });

                    if (nomesTimes.length >= 2) {
                        let timeA = nomesTimes[0];
                        let timeB = nomesTimes[1];

                        if (timeA && timeB && timeA !== timeB) {
                            resultados.push({
                                liga: ligaAtual,
                                tempo: tempo,
                                timeA: timeA,
                                timeB: timeB,
                                placar: placar
                            });
                        }
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

        console.log(`⚽ [Bot Ao Vivo Mobile] Partidas ativas encontradas: ${partidas.length}`);

        if (partidas.length > 0) {
            let novosEnviados = 0;

            for (let i = 0; i < partidas.length; i++) {
                let p = partidas[i];
                novosEnviados++;

                let card = `⚡ *Partida Ao Vivo [${novosEnviados}]*\n`;
                card += `🏆 *Competição:* \`${p.liga}\`\n`;
                card += `────────────────────\n`;
                card += `⏱ *Tempo:* \`${p.tempo}\`\n`;
                card += `⚽ **${p.timeA}** x **${p.timeB}**\n`;
                card += `📊 *Placar:* \` ${p.placar} \`\n`;
                card += `────────────────────`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600));
            }

            console.log(`✅ [Bot Ao Vivo Mobile] ${novosEnviados} partidas enviadas para o Telegram.`);

        } else {
            console.log("⚠️ Nenhuma partida ao vivo encontrada na varredura mobile.");
        }

    } catch (error) {
        console.error("❌ Erro crítico no monitor ao vivo mobile:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(buscarJogosAoVivo, 10 * 60 * 1000);
buscarJogosAoVivo();
