const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Monitor Ao Vivo Completo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot US] Acessando e buscando jogos AO VIVO (Completo)...");
        
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
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

        console.log("🌐 [Bot US] Acessando us.soccerway.com/matches/live/...");
        await page.goto('https://us.soccerway.com/matches/live/', {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        await new Promise(r => setTimeout(r, 6000));

        const partidas = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('tr, div, li');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                
                const ehLixo = txt.includes('FAVORITES') || txt.includes('PREMIER LEAGUE') || 
                              txt.includes('Copyright') || txt.includes('Soccerway') || 
                              txt.includes('Sign up') || txt.includes('Gamble') || 
                              txt.includes('privacy') || txt.length < 5 || txt.length > 350;

                if (!ehLixo) {
                    if ((txt.includes("'") || txt.includes("HT") || txt.includes("FT") || /\d+\s*-\s*\d+/.test(txt))) {
                        const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        
                        let tempo = linhas.find(l => /\d+'/.test(l) || l === 'HT' || l === 'FT') || 'AO VIVO';
                        let placar = linhas.find(l => /^\d+\s*-\s*\d+$/.test(l));
                        
                        // Filtra as linhas para isolar os nomes dos times com precisão
                        const limpos = linhas.filter(l => 
                            l !== tempo && 
                            l !== placar && 
                            !/^\d+$/.test(l) && 
                            !/^\d{2}:\d{2}$/.test(l) &&
                            !/copyright|gamble|privacy|soccerway|odds|\+?\d+/i.test(l) &&
                            l.length > 2
                        );

                        if (limpos.length >= 2 && placar) {
                            resultados.push({
                                tempo: tempo,
                                timeA: limpos[0],
                                timeB: limpos[1],
                                placar: placar
                            });
                        }
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

        console.log(`⚽ [Bot US] Partidas ao vivo encontradas: ${partidas.length}`);

        if (partidas.length > 0) {
            let enviados = 0;
            for (let i = 0; i < Math.min(partidas.length, 35); i++) {
                let p = partidas[i];
                enviados++;

                let card = `⚡ *Partida Ao Vivo [${enviados}]*\n`;
                card += `────────────────────\n`;
                card += `⏱ *Tempo:* \`${p.tempo}\`\n`;
                card += `⚽ **${p.timeA}** x **${p.timeB}**\n`;
                card += `📊 *Placar:* \` ${p.placar} \`\n`;
                card += `────────────────────`;
                
                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 500));
            }
            console.log(`✅ ${enviados} jogos completos enviados ao Telegram.`);
        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo encontrado no momento da varredura.*", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(buscarJogosAoVivo, 600000);
buscarJogosAoVivo();
