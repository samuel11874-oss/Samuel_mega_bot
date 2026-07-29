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
        console.log("🕵️‍♂️ [Bot US] Varredura limpa de partidas AO VIVO...");
        
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
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36');
        await page.setViewport({ width: 412, height: 915, isMobile: true });

        console.log("🌐 [Bot US] Acessando us.soccerway.com (Mobile View)...");
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

        // Varredura direta focada em capturar as linhas de partidas ativas
        const partidas = await page.evaluate(() => {
            const matches = [];
            const blocos = document.querySelectorAll('div, tr, li');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                
                if (txt && (txt.includes("'") || txt.includes('HT') || txt.includes('FT') || txt.includes('Half Time') || /\d+\s*-\s*\d+/.test(txt))) {
                    const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    if (linhas.length >= 3 && !txt.includes('Gamble') && !txt.includes('Copyright') && !txt.includes('Soccerway') && !txt.includes('FAVORITES')) {
                        matches.push(linhas);
                    }
                }
            });
            
            // Remove duplicadas
            const unicas = [];
            const vistas = new Set();
            matches.forEach(m => {
                const chave = m.slice(0, 3).join('-');
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });
            
            return unicas;
        });

        console.log(`⚽ [Bot US] Partidas capturadas com sucesso: ${partidas.length}`);

        if (partidas.length > 0) {
            await bot.sendMessage(CHAT_ID, `🔴 *MONITOR DE PARTIDAS AO VIVO* (${Math.min(partidas.length, 10)} jogos) ⚽`, { parse_mode: 'Markdown' }).catch(()=>{});

            for (let i = 0; i < Math.min(partidas.length, 10); i++) {
                const l = partidas[i];
                
                let tempo = "Ao Vivo";
                let timeA = "Casa";
                let timeB = "Fora";
                let golA = "0";
                let golB = "0";
                let extras = "";

                let idxTempo = l.findIndex(item => item.includes("'") || item === 'HT' || item === 'FT' || /^\d{1,2}$/.test(item));
                
                if (idxTempo !== -1) {
                    tempo = l[idxTempo];
                    if (idxTempo >= 2) {
                        timeA = l[idxTempo - 2] !== '*' ? l[idxTempo - 2] : l[idxTempo - 1];
                        timeB = l[idxTempo - 1];
                    }
                    if (l.length > idxTempo + 2) {
                        golA = l[idxTempo + 1] || "0";
                        golB = l[idxTempo + 2] || "0";
                        extras = l.slice(idxTempo + 3).filter(x => x !== '-' && x !== '' && !x.includes('+')).join(' | ');
                    }
                } else {
                    timeA = l[1] || "Casa";
                    timeB = l[2] || "Fora";
                    golA = l[3] || "0";
                    golB = l[4] || "0";
                    extras = l.slice(5).filter(x => x !== '-' && x !== '').join(' | ');
                }

                let card = `⚡ *Partida [${i + 1}]*\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱ *Tempo:* \`${tempo}\`\n`;
                card += `⚽ *Confronto:* **${timeA}** x **${timeB}**\n`;
                card += `📊 *Placar:* \` ${golA} x ${golB} \`\n`;
                
                if (extras && extras.length > 0) {
                    card += `📐 *Cantos / Estatísticas:* \`${extras}\`\n`;
                } else {
                    card += `📐 *Cantos / Estatísticas:* \`Aguardando dados oficiais\`\n`;
                }
                card += `━━━━━━━━━━━━━━━━━━━━━`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 500));
            }
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
