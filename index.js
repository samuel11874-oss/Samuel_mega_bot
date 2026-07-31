const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - V63 Definitivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV63() {
    let browser = null;
    try {
        console.log("⚡ [Radar V63] Buscando jogos usando o novo padrão de data e bloqueando falsos positivos...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        console.log("🌐 Acessando TotalCorner...");
        await page.goto('https://www.totalcorner.com/pt/match/live', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        await new Promise(r => setTimeout(r, 6000));

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Script de extração com os padrões exatos que descobrimos no log
        const partidasAoVivo = await page.evaluate(() => {
            const unicasSet = new Set();
            const blocos = document.querySelectorAll('tr, div.match-row, div.match-item');

            blocos.forEach(el => {
                const textoRaw = el.innerText || '';
                const texto = textoRaw.replace(/\s+/g, ' ').trim();

                if ((texto.includes('vs') || texto.includes(' - ')) && texto.length > 15) {
                    const textoLower = texto.toLowerCase();

                    // 1. O SEGREDO DO LOG: Se tem o formato "MM/DD HH:MM" (ex: 07/31 08:30), o jogo AINDA NÃO COMEÇOU!
                    const ehFuturo = /\d{2}\/\d{2}\s\d{2}:\d{2}/.test(texto);

                    // 2. Filtros de base e feminino
                    const ehSub = /sub\s*-?(19|20|21)|u\s*-?(19|20|21)/i.test(textoLower);
                    const ehFem = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    // 3. Verifica se tem marcador real de tempo (ex: 45', HT, 1ºT), e evita cair na pegadinha da palavra "feminino"
                    const temCronometro = /(\d{1,3})\s*['′]|ht|1ºt|2ºt|intervalo/i.test(textoLower);

                    // Só é aprovado se: NÃO é futuro, NÃO é sub, NÃO é feminino, E (tem cronômetro)
                    if (!ehFuturo && !ehSub && !ehFem && temCronometro) {
                        unicasSet.add(texto);
                    }
                }
            });

            return Array.from(unicasSet);
        });

        console.log(`📊 Partidas validadas como 100% AO VIVO: ${partidasAoVivo.length}`);

        if (partidasAoVivo.length > 0) {
            let mensagem = `🔴 <b>[RADAR TOTALCORNER - AO VIVO]</b>\n`;
            mensagem += `🔥 Total de jogos rolando agora: <code>${partidasAoVivo.length}</code>\n\n`;

            let blocoAtual = mensagem;
            let contador = 1;

            for (const partida of partidasAoVivo) {
                // Tenta extrair o minuto exato para colocar no topo do card
                const matchMinuto = partida.match(/(\d{1,3}\s*['′])/);
                const tempoInfo = matchMinuto ? `⏱ <b>[${matchMinuto[0].trim()}]</b>` : `⏱ <b>[AO VIVO]</b>`;

                let linhaJogo = `${tempoInfo} <b>#${contador}</b>\n<code>${partida}</code>\n\n`;
                
                if ((blocoAtual.length + linhaJogo.length) > 3800) {
                    await bot.sendMessage(CHAT_ID, blocoAtual, { parse_mode: 'HTML' }).catch(() => {});
                    await new Promise(r => setTimeout(r, 1000));
                    blocoAtual = `🔴 <b>[RADAR - CONTINUAÇÃO]</b>\n\n` + linhaJogo;
                } else {
                    blocoAtual += linhaJogo;
                }
                contador++;
            }

            if (blocoAtual.trim().length > 0) {
                await bot.sendMessage(CHAT_ID, blocoAtual, { parse_mode: 'HTML' }).catch(() => {});
            }
            console.log("✅ Radar enviado ao Telegram com sucesso!");
        } else {
            console.log("ℹ️ Nenhum jogo ao vivo encontrado nesta varredura.");
        }

    } catch (error) {
        console.error("❌ Erro V63:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ Erro V63: ${error.message}`, { parse_mode: 'HTML' });
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV63();
setInterval(executarRadarV63, 180000);
