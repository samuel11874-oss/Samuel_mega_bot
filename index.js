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
        console.log("🕵️‍♂️ [Bot US] Extraindo e formatando cards de jogos AO VIVO...");
        
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

        console.log("🌐 [Bot US] Acessando us.soccerway.com...");
        await page.goto('https://us.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        await new Promise(r => setTimeout(r, 4000));
        
        try {
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, span, div'));
                const abaLive = links.find(el => el.innerText && el.innerText.trim() === 'LIVE');
                if (abaLive) abaLive.click();
            });
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.log("⚠️ Seguindo com varredura geral.");
        }

        // Extração e limpeza detalhada dos blocos
        const partidas = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('tr, div, li');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                
                const ehLixo = txt.includes('Gamble') || txt.includes('Copyright') || txt.includes('Soccerway') || 
                               txt.includes('FAVORITES') || txt.includes('PREMIER LEAGUE') || txt.includes('LALIGA') ||
                               txt.length < 10 || txt.length > 130;

                if (!ehLixo && txt.includes('\n')) {
                    if (txt.includes("'") || txt.includes('Half Time') || txt.includes('FT') || /\d+[\s-]+\d+/.test(txt)) {
                        const formatado = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0).join(' | ');
                        if (!resultados.includes(formatado)) {
                            resultados.push(formatado);
                        }
                    }
                }
            });

            return resultados;
        });

        console.log(`⚽ [Bot US] Partidas capturadas: ${partidas.length}`);

        if (partidas.length > 0) {
            let msg = `🔴 *MONITOR DE PARTIDAS AO VIVO* ⚽\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

            partidas.slice(0, 10).forEach((p, i) => {
                // Quebra os dados coletados para organizar esteticamente em formato de card
                const partes = p.split(' | ').map(item => item.trim());
                
                let tempo = partes[0] || "Ao Vivo";
                let timeA = partes[1] || "Casa";
                let timeB = partes[2] || "Fora";
                let golA = partes[3] || "0";
                let golB = partes[4] || "0";
                
                // Pega dados extras/estatísticas/escanteios se houver nas colunas seguintes
                let extras = partes.slice(5).filter(x => x !== '-' && x !== '').join(' | ');

                msg += `⚡ *Partida [${i + 1}]*\n`;
                msg += `⏱ *Tempo:* \`${tempo}\`\n`;
                msg += `⚽ *Confronto:* **${timeA}** x **${timeB}**\n`;
                msg += `📊 *Placar:* \` ${golA} x ${golB} \`\n`;
                
                if (extras.length > 0) {
                    msg += `📐 *Info/Extras:* \`${extras}\`\n`;
                }
                
                msg += `-----------------------------------\n\n`;
            });

            msg += `🔥 *Atualizado em tempo real*`;

            bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo ao vivo encontrado no momento da varredura.*", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a verificação a cada 10 minutos
setInterval(buscarJogosAoVivo, 600000);
buscarJogosAoVivo();
