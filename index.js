const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Investigação Ao Vivo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Investigação Ao Vivo] Iniciando navegador mobile...");
        
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
        
        // Força o ambiente mobile idêntico ao seu celular
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

        const urlLive = 'https://us.soccerway.com/matches/live/';
        console.log(`🌐 Acessando URL direta: ${urlLive}`);

        await page.goto(urlLive, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando carregamento dos dados da página...");
        await new Promise(r => setTimeout(r, 9000));

        // Executa a extração investigativa focada na estrutura real do Soccerway Mobile
        const partidas = await page.evaluate(() => {
            const resultados = [];
            let ligaAtual = 'COMPETIÇÃO AO VIVO';

            const elementos = document.querySelectorAll('tr, div');

            elementos.forEach(el => {
                const txt = el.innerText ? el.innerText.trim() : '';
                if (!txt || txt.length < 5) return;

                // Detecta se é o nome da liga/país
                if (el.className.includes('competition') || el.className.includes('group') || el.className.includes('header') || (el.querySelector('img') && txt.length < 50 && !/\d+'/.test(txt))) {
                    if (txt.length < 60 && !txt.includes('-')) {
                        ligaAtual = txt.replace(/\n/g, ' - ');
                    }
                    return;
                }

                // Procura por linhas que contenham minuto (ex: 79', 74') ou placar (ex: 4 - 2, 0 - 0)
                const temMinuto = /\d+'/.test(txt) || /HT|FT/i.test(txt);
                const temPlacar = /\d+\s*-\s*\d+/.test(txt);

                if (temMinuto || temPlacar) {
                    const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    let tempo = 'AO VIVO';
                    let placar = '0 x 0';
                    const times = [];

                    linhas.forEach(l => {
                        if (/^\d+'$|^HT$|^FT$/i.test(l)) {
                            tempo = l;
                        } else if (/^\d+\s*-\s*\d+$/.test(l)) {
                            placar = l;
                        } else if (l.length > 2 && !/^\d+$/.test(l) && !/usa|brazil|argentina|mexico|colombia|chile/i.test(l)) {
                            times.push(l);
                        }
                    });

                    if (times.length >= 2) {
                        resultados.push({
                            liga: ligaAtual,
                            tempo: tempo,
                            timeA: times[0],
                            timeB: times[1],
                            placar: placar,
                            bruto: txt
                        });
                    }
                }
            });

            // Remove duplicatas exatas baseadas nos times
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

        console.log(`⚽ [Investigação] Partidas encontradas: ${partidas.length}`);
        console.log("📝 Dados capturados:", JSON.stringify(partidas, null, 2));

        if (partidas.length > 0) {
            for (let i = 0; i < partidas.length; i++) {
                let p = partidas[i];
                let card = `🔥 *Jogo Ao Vivo [${i + 1}]*\n`;
                card += `🏆 *Liga:* \`${p.liga}\`\n`;
                card += `────────────────────\n`;
                card += `⏱ *Tempo:* \`${p.tempo}\`\n`;
                card += `⚽ **${p.timeA}** x **${p.timeB}**\n`;
                card += `📊 *Placar:* \` ${p.placar} \`\n`;
                card += `────────────────────`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 700));
            }
            console.log(`✅ [Investigação] Todos os ${partidas.length} jogos enviados ao Telegram com sucesso!`);
        } else {
            console.log("⚠️ A investigação não encontrou partidas. Verifique os logs acima.");
        }

    } catch (error) {
        console.error("❌ Erro na investigação:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(buscarJogosAoVivo, 10 * 60 * 1000);
buscarJogosAoVivo();
