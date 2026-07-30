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
        console.log("🕵️‍♂️ [Bot US] Acessando e varrendo aba LIVE do Soccerway...");
        
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

        console.log("🌐 [Bot US] Acessando us.soccerway.com/matches/live/...");
        await page.goto('https://us.soccerway.com/matches/live/', {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        // Aguarda tempo suficiente para a renderização completa dos dados ao vivo via JS do site
        console.log("⏳ Aguardando renderização dos jogos ao vivo...");
        await new Promise(r => setTimeout(r, 9000));

        const partidas = await page.evaluate(() => {
            const resultados = [];
            // Varre as linhas e blocos onde o Soccerway organiza as partidas ao vivo
            const blocos = document.querySelectorAll('tr, .match, li, div');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                if (!txt || txt.length < 8 || txt.length > 500) return;

                // Ignora elementos de navegação, rodapé ou propagandas
                if (/copyright|soccerway|sign up|gamble|privacy|Full-time|Finished/i.test(txt)) return;

                // Identifica se a linha contém indicação de tempo de jogo ao vivo (ex: minutos seguidos de ' ou acréscimos como 90+1)
                const temMinutoAtivo = /\d+('\+\d+)?/.test(txt) || /\bHT\b/.test(txt);
                if (!temMinutoAtivo) return;

                const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                
                // Procura o marcador de tempo de jogo
                let tempo = linhas.find(l => /\d+('\+\d+)?/.test(l) || l === 'HT') || 'AO VIVO';
                // Procura o placar no formato X - Y
                let placarMatch = linhas.find(l => /^\d+\s*-\s*\d+$/.test(l));

                // Filtra os textos para isolar os nomes dos times
                const limpos = linhas.filter(l => 
                    l !== tempo && 
                    l !== placarMatch && 
                    !/^\d+$/.test(l) && 
                    !/^\d{2}:\d{2}$/.test(l) &&
                    !/odds|\+?\d+|FT|HT/i.test(l) &&
                    l.length > 2
                );

                if (limpos.length >= 2 && placarMatch) {
                    resultados.push({
                        tempo: tempo,
                        timeA: limpos[0],
                        timeB: limpos[1],
                        placar: placarMatch
                    });
                }
            });

            // Remove duplicatas exatas baseadas no confronto
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

        console.log(`⚽ [Bot US] Partidas ao vivo capturadas com sucesso: ${partidas.length}`);

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
            console.log(`✅ ${enviados} partidas ao vivo enviadas para o Telegram.`);
        } else {
            console.log("⚠️ Nenhuma partida encontrada na varredura.");
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo ao vivo encontrado no momento da varredura.*", { parse_mode: 'Markdown' }).catch(()=>{});
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
