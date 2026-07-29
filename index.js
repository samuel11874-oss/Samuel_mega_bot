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
        console.log("🕵️‍♂️ [Bot US] Varredura inteligente de campeonatos e partidas AO VIVO...");
        
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

        // Varredura flexível para capturar campeonatos e partidas ao vivo sem falhas
        const partidas = await page.evaluate(() => {
            const matches = [];
            let currentComp = "Futebol Ao Vivo";
            
            const elements = document.querySelectorAll('tr, h2, h3, h4, th, div');
            
            elements.forEach(el => {
                const text = el.innerText ? el.innerText.trim() : '';
                
                // Atualiza o nome do campeonato quando encontra um cabeçalho válido
                if ((el.tagName === 'TH' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4' || el.className.includes('competition') || el.className.includes('title') || el.className.includes('group')) && text.length > 3 && text.length < 90) {
                    if (!text.includes("'") && !/\d+\s*-\s*\d+/.test(text) && !text.includes("Gamble")) {
                        currentComp = text;
                    }
                }
                
                // Detecta e extrai a linha do jogo
                const ehLixo = text.includes('Gamble') || text.includes('Copyright') || text.includes('Soccerway') || text.includes('FAVORITES');
                if (!ehLixo && text.includes('\n')) {
                    if (text.includes("'") || text.includes('Half Time') || text.includes('FT') || text.includes('HT') || /\d+\s*-\s*\d+/.test(text)) {
                        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        if (lines.length >= 3) {
                            matches.push({
                                competicao: currentComp,
                                linhas: lines
                            });
                        }
                    }
                }
            });
            
            // Remove duplicadas
            const unique = [];
            const seen = new Set();
            matches.forEach(m => {
                const key = m.linhas.join('|');
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(m);
                }
            });
            
            return unique;
        });

        console.log(`⚽ [Bot US] Partidas capturadas com sucesso: ${partidas.length}`);

        if (partidas.length > 0) {
            await bot.sendMessage(CHAT_ID, `🔴 *MONITOR DE PARTIDAS AO VIVO* (${Math.min(partidas.length, 10)} jogos) ⚽`, { parse_mode: 'Markdown' }).catch(()=>{});

            for (let i = 0; i < Math.min(partidas.length, 10); i++) {
                const p = partidas[i];
                const l = p.linhas;
                
                let tempo = l[0] || "Ao Vivo";
                let timeA = l[1] || "Casa";
                let timeB = l[2] || "Fora";
                let golA = l[3] || "0";
                let golB = l[4] || "0";
                
                let extras = l.slice(5).filter(x => x !== '-' && x !== '').join(' | ');

                let card = `🏆 *${p.competicao}*\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱ *Tempo:* \`${tempo}\`\n`;
                card += `⚽ *Confronto:* **${timeA}** x **${timeB}**\n`;
                card += `📊 *Placar:* \` ${golA} x ${golB} \`\n`;
                
                if (extras.length > 0) {
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
