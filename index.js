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
        console.log("🕵️‍♂️ [Bot US] Varredura ampla em tabelas para capturar TODOS os jogos ao vivo...");
        
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
            console.log("🔍 [Bot US] Clicando na aba 'LIVE'...");
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, span, div'));
                const abaLive = links.find(el => el.innerText && el.innerText.trim() === 'LIVE');
                if (abaLive) abaLive.click();
            });
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.log("⚠️ Seguindo com varredura geral.");
        }

        // Varredura focada nas linhas de tabela (tr) onde o Soccerway lista as partidas
        const partidas = await page.evaluate(() => {
            const matches = [];
            const rows = document.querySelectorAll('tr');

            rows.forEach(tr => {
                const txt = tr.innerText ? tr.innerText.trim() : '';
                
                const ehLixo = txt.includes('Gamble') || txt.includes('Copyright') || txt.includes('Soccerway') || 
                               txt.includes('FAVORITES') || txt.includes('PREMIER LEAGUE') || txt.length < 10;

                if (!ehLixo) {
                    // Identifica linhas que possuem tempo de jogo ou placar
                    if (txt.includes("'") || txt.includes('HT') || txt.includes('FT') || /\d+\s*-\s*\d+/.test(txt)) {
                        const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        if (linhas.length >= 3) {
                            matches.push(linhas);
                        }
                    }
                }
            });
            
            // Remove duplicadas com base no conteúdo da linha
            const unicas = [];
            const vistas = new Set();
            matches.forEach(m => {
                const chave = m.slice(0, 4).join('|');
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });
            
            return unicas;
        });

        console.log(`⚽ [Bot US] Total de partidas ao vivo encontradas: ${partidas.length}`);

        if (partidas.length > 0) {
            await bot.sendMessage(CHAT_ID, `🔴 *MONITOR DE PARTIDAS AO VIVO* (${Math.min(partidas.length, 30)} jogos) ⚽`, { parse_mode: 'Markdown' }).catch(()=>{});

            for (let i = 0; i < Math.min(partidas.length, 30); i++) {
                const l = partidas[i];
                
                let tempo = l[0] || "Ao Vivo";
                let timeA = l[1] || "Casa";
                let timeB = l[2] || "Fora";
                let golA = l[3] || "0";
                let golB = l[4] || "0";
                
                let extras = l.slice(5).filter(x => x !== '-' && x !== '' && !x.includes('+')).join(' | ');
                if (!extras || extras.length < 2) extras = "Aguardando dados oficiais";

                let card = `⚡ *Partida [${i + 1}]*\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏱ *Tempo:* \`${tempo}\`\n`;
                card += `⚽ *Confronto:* **${timeA}** x **${timeB}**\n`;
                card += `📊 *Placar:* \` ${golA} x ${golB} \`\n`;
                card += `📐 *Cantos / Estatísticas:* \`${extras}\`\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                await new Promise(r => setTimeout(r, 400));
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
