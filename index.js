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
        console.log("🕵️‍♂️ [Bot US] Varredura limpa e organizada de partidas AO VIVO...");
        
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

        // Varredura estrita com limite de caracteres por bloco para evitar bagunça
        const partidas = await page.evaluate(() => {
            const matches = [];
            const elementos = document.querySelectorAll('div, tr, li');

            elementos.forEach(el => {
                const txt = el.innerText ? el.innerText.trim() : '';
                
                // Filtro rigoroso: garante que o bloco é pequeno o suficiente para ser apenas uma partida isolada
                if (txt.length > 15 && txt.length < 150) {
                    if (txt.includes("'") || txt.includes('HT') || txt.includes('FT') || /\d+\s*-\s*\d+/.test(txt)) {
                        const ehLixo = txt.includes('Gamble') || txt.includes('Copyright') || txt.includes('Soccerway') || txt.includes('FAVORITES');
                        
                        if (!ehLixo) {
                            const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                            if (linhas.length >= 3 && linhas.length <= 10) {
                                matches.push(linhas);
                            }
                        }
                    }
                }
            });
            
            // Remove duplicadas baseadas nos primeiros dados da partida
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

        console.log(`⚽ [Bot US] Partidas limpas capturadas: ${partidas.length}`);

        if (partidas.length > 0) {
            await bot.sendMessage(CHAT_ID, `🔴 *MONITOR DE PARTIDAS AO VIVO* (${Math.min(partidas.length, 10)} jogos) ⚽`, { parse_mode: 'Markdown' }).catch(()=>{});

            for (let i = 0; i < Math.min(partidas.length, 10); i++) {
                const l = partidas[i];
                
                let tempo = "Ao Vivo";
                let timeA = "Casa";
                let timeB = "Fora";
                let golA = "0";
                let golB = "0";
                let extras = "Aguardando dados oficiais";

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
                        
                        let possiveisExtras = l.slice(idxTempo + 3).filter(x => x !== '-' && x !== '' && !x.includes('+') && x.length < 10);
                        if (possiveisExtras.length > 0) {
                            extras = possiveisExtras.join(' | ');
                        }
                    }
                } else {
                    timeA = l[1] || "Casa";
                    timeB = l[2] || "Fora";
                    golA = l[3] || "0";
                    golB = l[4] || "0";
                }

                let card = `⚡ *Partida [${i + 1}]*\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱ *Tempo:* \`${tempo}\`\n`;
                card += `⚽ *Confronto:* **${timeA}** x **${timeB}**\n`;
                card += `📊 *Placar:* \` ${golA} x ${golB} \`\n`;
                card += `📐 *Cantos / Estatísticas:* \`${extras}\`\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 600));
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
