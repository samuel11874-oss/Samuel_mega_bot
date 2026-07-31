const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Radar V60 Estrito Ao Vivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRadarV60() {
    let browser = null;
    try {
        console.log("⚡ [Radar V60] Buscando estritamente jogos em andamento com minuto ativo...");

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
        
        console.log("🌐 Acessando https://www.totalcorner.com/pt/match/live ...");
        await page.goto('https://www.totalcorner.com/pt/match/live', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log("⏳ Aguardando carregamento e rolando a página...");
        await new Promise(r => setTimeout(r, 6000));

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(r => setTimeout(r, 2000));
        }

        // Extração focada estritamente em jogos ao vivo (exigindo minuto real ou marcador de tempo de jogo)
        const partidasAoVivoReais = await page.evaluate(() => {
            const unicasSet = new Set();
            const blocos = document.querySelectorAll('.match-row, tr, div');

            blocos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                // Deve conter um confronto válido
                if ((texto.includes('vs') || texto.includes(' - ')) && texto.length > 15 && texto.length < 600) {
                    const textoLower = texto.toLowerCase();

                    // Critério estrito para ser AO VIVO: deve conter marcador de minuto (ex: 48', 12') ou HT/Intervalo/1ºT/2ºT
                    // E NÃO deve conter o rótulo de "Hora" de jogo futuro
                    const temMinutoAtivo = /(\d{1,3})\s*['′]|ht|1ºt|2ºt|intervalo/i.test(texto);
                    const ehFuturo = /hora\s*\d{2}:\d{2}/i.test(textoLower);

                    // Filtros de categoria: Sem Sub-19, Sub-20 e Feminino
                    const ehSub19ou20 = /sub\s*-?(19|20)|u\s*-?(19|20)/i.test(textoLower);
                    const ehFeminino = /\(w\)|\bwomen\b|feminino|\(f\)/i.test(textoLower);

                    if (temMinutoAtivo && !ehFuturo && !ehSub19ou20 && !ehFeminino) {
                        unicasSet.add(texto);
                    }
                }
            });

            return Array.from(unicasSet);
        });

        console.log(`📊 Jogos estritamente ao vivo encontrados: ${partidasAoVivoReais.length}`);

        if (partidasAoVivoReais.length > 0) {
            let mensagem = `🔴 <b>[RADAR TOTALCORNER - AO VIVO REAL]</b>\n`;
            mensagem += `🔥 Jogos com cronômetro ativo: <code>${partidasAoVivoReais.length}</code>\n\n`;

            let blocoAtual = mensagem;
            let contador = 1;

            for (const partida of partidasAoVivoReais) {
                // Extrai o minuto exato para destacar no card
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

            console.log("✅ Relatório de jogos estritamente ao vivo enviado com sucesso!");
        } else {
            console.log("ℹ️ Nenhum jogo ao vivo com minuto ativo no momento.");
            await bot.sendMessage(CHAT_ID, `⚠️ <b>Aviso:</b> Nenhum jogo ao vivo com cronômetro ativo encontrado no momento.`, { parse_mode: 'HTML' });
        }

    } catch (error) {
        console.error("❌ Erro V60:", error.message);
        await bot.sendMessage(CHAT_ID, `❌ <b>Erro V60:</b> <code>${error.message}</code>`, { parse_mode: 'HTML' }).catch(() => {});
    } finally {
        if (browser) await browser.close();
    }
}

executarRadarV60();
setInterval(executarRadarV60, 180000);
