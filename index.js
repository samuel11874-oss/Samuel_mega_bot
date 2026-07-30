const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V43 Clique Live 🎯</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV43() {
    let browser = null;
    try {
        console.log("🎯 [Bot V43] Acessando TotalCorner para interagir com a aba Live...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1366,768'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

        console.log("🌐 Acessando https://www.totalcorner.com/match/today ...");
        await page.goto('https://www.totalcorner.com/match/today', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 4000));

        // Procura na página inteira qualquer elemento escrito "Live" ou "Ao Vivo" e clica nele
        const clicouAbaLive = await page.evaluate(() => {
            const elementos = Array.from(document.querySelectorAll('a, button, span, li, div'));
            for (const el of elementos) {
                const texto = el.innerText.trim().toLowerCase();
                if (texto === 'live' || texto === 'ao vivo' || texto === 'in-play') {
                    el.click();
                    return true;
                }
            }
            return false;
        });

        console.log(`🖱️ Botão/Aba 'Live' foi encontrado e clicado? ${clicouAbaLive}`);

        if (clicouAbaLive) {
            console.log("⏳ Aguardando 6 segundos para a tabela ao vivo carregar após o clique...");
            await new Promise(r => setTimeout(r, 6000));
        }

        // Extrai estritamente jogos que tenham o minuto rolando (ex: 35', HT)
        const jogosAoVivoReais = await page.evaluate(() => {
            const lista = [];
            const trs = Array.from(document.querySelectorAll('tr'));

            trs.forEach(tr => {
                const textoLinha = tr.innerText || '';

                // Verifica se tem marcador de minuto de jogo ao vivo e NÃO tem data/hora fixa
                const temMinutoAoVivo = /(\d{1,2}'|HT|2H|1H)/.test(textoLinha);
                const temHorarioFixo = /\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(textoLinha);

                if (temMinutoAoVivo && !temHorarioFixo) {
                    const teamLinks = Array.from(tr.querySelectorAll('a[href*="/team/"]'));
                    if (teamLinks.length >= 2) {
                        const timeA = teamLinks[0].innerText.trim();
                        const timeB = teamLinks[1].innerText.trim();

                        // Extrai o minuto exato
                        let minuto = "Ao Vivo";
                        const matchMin = textoLinha.match(/(\d{1,2}'(\+\d+)?|HT)/);
                        if (matchMin) minuto = matchMin[0];

                        lista.push({
                            timeA,
                            timeB,
                            minuto,
                            textoCompleto: textoLinha.replace(/\s+/g, ' ').trim()
                        });
                    }
                }
            });

            // Remove duplicados
            const unicos = [];
            const vistos = new Set();
            lista.forEach(item => {
                const chave = `${item.timeA} x ${item.timeB}`;
                if (!vistos.has(chave)) {
                    vistos.add(chave);
                    unicos.push(item);
                }
            });

            return unicos;
        });

        console.log(`⚡ [Bot V43] Jogos AO VIVO reais encontrados: ${jogosAoVivoReais.length}`);

        if (jogosAoVivoReais.length > 0) {
            let header = `⚡ <b>[RADAR V43 - AO VIVO REAL]</b>\n🔥 Total encontrados: <code>${jogosAoVivoReais.length}</code>\n\n`;
            await bot.sendMessage(CHAT_ID, header, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            for (let i = 0; i < Math.min(jogosAoVivoReais.length, 10); i++) {
                const j = jogosAoVivoReais[i];
                let card = `⚽ <b>AO VIVO #${i+1}</b>\n`;
                card += `⏱️ <b>Tempo:</b> <code>${j.minuto}</code>\n`;
                card += `🏠 <b>${j.timeA}</b> vs ✈️ <b>${j.timeB}</b>\n`;
                card += `📄 <code>${j.textoCompleto}</code>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 500));
            }
        } else {
            console.log("ℹ️ Nenhum jogo ao vivo encontrado após o clique.");
            await bot.sendMessage(CHAT_ID, `ℹ️ <b>[V43 Ao Vivo]</b> Nenhum jogo rolando no momento da varredura com aba Live.`, { parse_mode: 'HTML' }).catch(() => {});
        }

    } catch (error) {
        console.error("❌ Erro V43:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V43:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a cada 3 minutos
setInterval(executarRadarV43, 180000);
executarRadarV43();
