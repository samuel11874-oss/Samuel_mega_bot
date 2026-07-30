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
        console.log("🕵️‍♂️ [Bot US] Acessando us.soccerway.com e varrendo jogos...");
        
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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        await page.goto('https://us.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        await new Promise(r => setTimeout(r, 4000));
        
        try {
            console.log("🔍 Clicando na aba 'LIVE'...");
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, span, div'));
                const abaLive = links.find(el => el.innerText && el.innerText.trim() === 'LIVE');
                if (abaLive) abaLive.click();
            });
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.log("⚠️ Não foi possível clicar na aba Live diretamente.");
        }

        // --- EXTRATOR INTELIGENTE DIRETO NO NAVEGADOR ---
        const partidas = await page.evaluate(() => {
            const resultados = [];
            const linhasTabela = document.querySelectorAll('tr, .match');

            linhasTabela.forEach(row => {
                const txt = row.innerText ? row.innerText.trim() : '';
                if (!txt || txt.length < 8) return;

                // 🚫 Ignora lixos de interface e JOGOS ENCERRADOS (FT / Full-time)
                if (/Copyright|Soccerway|Sign up|Premier League|Favorites|Full-time|Finished|\bFT\b/i.test(txt)) return;

                const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                
                // Identifica o tempo de jogo
                const tempoEl = linhas.find(l => /^\d{1,2}'?$/.test(l) || /^\d+\+\d+'?$/.test(l) || /^HT$/i.test(l));

                // Identifica os nomes dos dois times
                const times = linhas.filter(l => 
                    !/^\d+$/.test(l) && 
                    !/^\d+[\'-]+/.test(l) && 
                    !/^\d+\s*-\s*\d+$/.test(l) && 
                    !/^\d{2}:\d{2}$/.test(l) && 
                    !/^HT$/i.test(l) && 
                    !/^FT$/i.test(l) &&
                    l.length > 1
                );

                // Identifica placar (formatado "1 - 0" ou números isolados de gols)
                const placarEl = linhas.find(l => /^\d+\s*-\s*\d+$/.test(l) || /^\d+\s*:\s*\d+$/.test(l));
                const numerosSoltos = linhas.filter(l => /^\d+$/.test(l) && l !== tempoEl);

                if (times.length >= 2) {
                    let golA = "0", golB = "0";
                    if (placarEl) {
                        const p = placarEl.split(/[-:]/);
                        golA = p[0].trim();
                        golB = p[1].trim();
                    } else if (numerosSoltos.length >= 2) {
                        golA = numerosSoltos[0];
                        golB = numerosSoltos[1];
                    }

                    let tempoFinal = tempoEl ? tempoEl : "Ao Vivo";
                    if (/^\d+$/.test(tempoFinal)) tempoFinal += "'";

                    resultados.push({
                        timeA: times[0],
                        timeB: times[1],
                        placar: `${golA} x ${golB}`,
                        tempo: tempoFinal
                    });
                }
            });

            // Remove duplicatas
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

        console.log(`⚽ [Bot US] Partidas AO VIVO prontas para envio: ${partidas.length}`);

        if (partidas.length > 0) {
            let enviados = 0;
            for (let i = 0; i < Math.min(partidas.length, 25); i++) {
                let p = partidas[i];
                enviados++;

                let card = `⚡ *Partida Ao Vivo [${enviados}]*\n`;
                card += `────────────────────\n`;
                card += `⏱ *Tempo:* \`${p.tempo}\`\n`;
                card += `⚽ **${p.timeA}** x **${p.timeB}**\n`;
                card += `📊 *Placar:* \` ${p.placar} \`\n`;
                card += `📐 *Cantos / Cartões:* \`Aguardando dados oficiais\`\n`;
                card += `────────────────────`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 500));
            }
            console.log(`✅ ${enviados} mensagens enviadas ao Telegram com sucesso!`);
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

setInterval(buscarJogosAoVivo, 600000);
buscarJogosAoVivo();
