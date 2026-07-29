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
        console.log("🕵️‍♂️ [Bot US] Acessando e buscando jogos AO VIVO...");
        
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
            console.log("🔍 [Bot US] Procurando e clicando na aba 'LIVE'...");
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, span, div'));
                const abaLive = links.find(el => el.innerText && el.innerText.trim() === 'LIVE');
                if (abaLive) abaLive.click();
            });
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.log("⚠️ Não foi possível clicar na aba Live diretamente, seguindo com varredura geral.");
        }

        // Varredura rigorosa focada apenas em jogos reais e filtrando propagandas/lixo
        const partidas = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('tr, div, li');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                
                // Filtros rigorosos para remover lixo do site
                const ehLixo = txt.includes('FAVORITES') || txt.includes('PREMIER LEAGUE') || 
                               txt.includes('Gamble') || txt.includes('Copyright') || 
                               txt.includes('Soccerway') || txt.includes('Sign up') || 
                               txt.length < 10 || txt.length > 140;

                if (!ehLixo) {
                    // Garante que tem indicador de tempo ou placar válido
                    if ((txt.includes("'") || txt.includes("Half Time") || txt.includes("HT") || txt.includes("FT") || /\d+[\s-]+\d+/.test(txt))) {
                        const formatado = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        
                        // Valida se tem elementos suficientes para ser um jogo (Tempo + Times + Placar)
                        if (formatado.length >= 3 && !resultados.some(r => r.join('|') === formatado.join('|'))) {
                            resultados.push(formatado);
                        }
                    }
                }
            });

            return resultados;
        });

        console.log(`⚽ [Bot US] Partidas ao vivo válidas encontradas: ${partidas.length}`);

        if (partidas.length > 0) {
            // Envia cada jogo como um card individual separado
            for (let i = 0; i < Math.min(partidas.length, 20); i++) {
                let p = partidas[i];
                
                // Extrai as informações de forma limpa da matriz capturada
                let tempo = p.find(item => item.includes("'") || item.includes("Half") || item === 'HT' || item === 'FT') || p[0] || "Ao Vivo";
                let limpos = p.filter(x => x !== tempo && x !== '-' && !x.includes(':') && x.length > 2);
                
                let timeA = limpos[0] || "Casa";
                let timeB = limpos[1] || "Fora";
                
                // Procura o placar dentro dos dados
                let placarMatch = p.find(item => /^\d+\s*-\s*\d+$/.test(item)) || limpos.find(item => /^\d+\s*-\s*\d+$/.test(item));
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

                // Monta o card individual limpo e profissional
                let card = `⚡ *Partida [${i + 1}]*\n`;
                card += `────────────────────\n`;
                card += `⏱ *Tempo:* \`${tempo}\`\n`;
                card += `⚽ **${timeA}** x **${timeB}**\n`;
                card += `📊 *Placar:* \` ${golA} x ${golB} \`\n`;
                card += `────────────────────`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                
                // Pequeno intervalo entre os envios para não sobrecarregar o Telegram
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
