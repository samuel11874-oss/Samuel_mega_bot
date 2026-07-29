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
        console.log("🕵️‍♂️ [Bot US] Acessando e buscando jogos AO VIVO (Cards individuais)...");
        
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

        console.log("🌐 [Bot US] Acessando https://us.soccerway.com/live/ ...");
        await page.goto('https://us.soccerway.com/live/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 6000));

        // Extração focada em linhas de tabela limpas
        const partidas = await page.evaluate(() => {
            const matches = [];
            const rows = document.querySelectorAll('tr');

            rows.forEach(row => {
                const txt = row.innerText ? row.innerText.trim() : '';
                const ehLixo = txt.includes('Gamble') || txt.includes('Copyright') || txt.includes('Soccerway') || 
                               txt.includes('FAVORITES') || txt.length < 5;

                if (!ehLixo) {
                    if (txt.includes("'") || txt.includes('HT') || txt.includes('FT') || /\d+\s*-\s*\d+/.test(txt)) {
                        const cells = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim()).filter(t => t.length > 0);
                        if (cells.length >= 3) {
                            matches.push(cells);
                        } else {
                            const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                            if (linhas.length >= 2) {
                                matches.push(linhas);
                            }
                        }
                    }
                }
            });
            
            // Remove duplicadas estruturais
            const unicas = [];
            const vistas = new Set();
            matches.forEach(m => {
                const chave = m.slice(0, 3).join('|');
                if (!vistas.has(chave) && m.length >= 2) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });
            
            return unicas;
        });

        console.log(`⚽ [Bot US] Total de partidas ao vivo encontradas: ${partidas.length}`);

        if (partidas.length > 0) {
            // Envia cada partida como um card individual separado
            for (let i = 0; i < Math.min(partidas.length, 25); i++) {
                let l = partidas[i];
                
                let tempo = l.find(item => item.includes("'") || item === 'HT' || item === 'FT') || l[0] || "Ao Vivo";
                let limpos = l.filter(x => x !== tempo && x !== '-' && !x.includes(':') && x.length > 2);
                
                let timeA = limpos[0] || "Casa";
                let timeB = limpos[1] || "Fora";

                let placarMatch = l.find(item => /\d+\s*-\s*\d+/.test(item));
                let golA = "0", golB = "0";
                
                if (placarMatch) {
                    let partesPlacar = placarMatch.split('-');
                    golA = partesPlacar[0] ? partesPlacar[0].trim() : "0";
                    golB = partesPlacar[1] ? partesPlacar[1].trim() : "0";
                } else {
                    let numeros = limpos.filter(x => /^\d+$/.test(x));
                    if (numeros.length >= 2) {
                        golA = numeros[0];
                        golB = numeros[1];
                    }
                }

                // Monta o card individual limpo e elegante
                let card = `⚡ *Partida [${i + 1}]*\n`;
                card += `────────────────────\n`;
                card += `⏱ *Tempo:* \`${tempo}\`\n`;
                card += `⚽ **${timeA}** x **${timeB}**\n`;
                card += `📊 *Placar:* \` ${golA} x ${golB} \`\n`;
                card += `────────────────────`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                
                // Intervalo de 600ms para evitar bloqueio por spam no Telegram
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
