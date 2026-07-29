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
        console.log("🕵️‍♂️ [Bot US] Acessando diretamente a página de AO VIVO...");
        
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

        // Aguarda os dados dinâmicos da página de live carregarem
        await new Promise(r => setTimeout(r, 6000));

        // Varredura rigorosa: foca apenas em linhas que possuem marcação clara de tempo de jogo AO VIVO
        const partidas = await page.evaluate(() => {
            const resultados = [];
            const rows = document.querySelectorAll('tr');

            rows.forEach(row => {
                const txt = row.innerText ? row.innerText.trim() : '';
                
                // Remove propagandas, rodapés e lixo do site
                const ehLixo = txt.includes('Gamble') || txt.includes('Copyright') || 
                               txt.includes('Soccerway') || txt.includes('FAVORITES') || 
                               txt.length < 5;

                if (!ehLixo) {
                    // CONDIÇÃO RIGOROSA: O jogo DEVE ter um marcador de minuto ativo (ex: 14', 45'+2) ou estar no HT. Ignora FT (Encerrado) e horários normais (ex: 20:00).
                    const temMinutoAtivo = /\d+'/.test(txt) || txt.includes('Half Time') || txt.includes('HT');
                    const temPlacar = /\d+\s*-\s*\d+/.test(txt);

                    if (temMinutoAtivo && temPlacar && !txt.includes('FT')) {
                        const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        if (linhas.length >= 2) {
                            resultados.push(linhas);
                        }
                    }
                }
            });

            // Remove duplicadas
            const unicas = [];
            const vistas = new Set();
            resultados.forEach(m => {
                const chave = m.slice(0, 3).join('|');
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot US] Partidas estritamente AO VIVO encontradas: ${partidas.length}`);

        if (partidas.length > 0) {
            // Envia cada jogo em um card individual limpo e separado
            for (let i = 0; i < Math.min(partidas.length, 25); i++) {
                let p = partidas[i];
                
                let tempo = p.find(item => item.includes("'") || item.includes("Half") || item === 'HT') || "Ao Vivo";
                let limpos = p.filter(x => x !== tempo && x !== '-' && !x.includes(':') && x.length > 2);
                
                let timeA = limpos[0] || "Casa";
                let timeB = limpos[1] || "Fora";
                
                let placarMatch = p.find(item => /\d+\s*-\s*\d+/.test(item)) || limpos.find(item => /\d+\s*-\s*\d+/.test(item));
                let golA = "0", golB = "0";

                if (placarMatch) {
                    let partes = placarMatch.split('-');
                    golA = partes[0].trim();
                    golB = partes[1].trim();
                } else {
                    let numeros = limpos.filter(x => /^\d+$/.test(x));
                    if (numeros.length >= 2) {
                        golA = numeros[0];
                        golB = numeros[1];
                    }
                }

                // Monta o card individual organizado
                let card = `⚡ *Partida [${i + 1}]*\n`;
                card += `────────────────────\n`;
                card += `⏱ *Tempo:* \`${tempo}\`\n`;
                card += `⚽ **${timeA}** x **${timeB}**\n`;
                card += `📊 *Placar:* \` ${golA} x ${golB} \`\n`;
                card += `────────────────────`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                
                // Intervalo de segurança para não floodar o Telegram
                await new Promise(r => setTimeout(r, 600));
            }

        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo ao vivo rolando no momento da varredura.*", { parse_mode: 'Markdown' }).catch(()=>{});
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
