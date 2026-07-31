const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Áustria Ao Vivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const jogosEnviadosCache = new Set();

// Filtro restrito exclusivamente para o futebol da Áustria (todas as divisões)
function ehFutebolAustria(texto) {
    const termoAustria = /austria|austríaca|öfb|bundesliga austria|2. liga|regionalliga ost|regionalliga mitte|regionalliga west/i;
    return termoAustria.test(texto);
}

async function varrerEEnviarAustria() {
    let browser = null;
    try {
        console.log("⚡ [Radar Áustria] Conectando ao SokkerPRO...");

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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');

        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 120000
        });

        console.log("⏳ Aguardando os dados ao vivo carregarem...");
        await new Promise(r => setTimeout(r, 6000));

        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        const partidasExtraidas = await page.evaluate(() => {
            const lista = [];
            const blocos = document.querySelectorAll('div');

            blocos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';
                
                if (texto.includes(' - ') && (texto.includes("'") || texto.includes('HT') || texto.includes('FT'))) {
                    const linhasDetalhadas = texto.split('\n').map(p => p.trim()).filter(p => p.length > 0);
                    
                    let placar = "0 x 0";
                    const matchPlacar = texto.match(/(\d{1,2})\s*x\s*(\d{1,2})/);
                    if (matchPlacar) {
                        placar = `${matchPlacar[1]} x ${matchPlacar[2]}`;
                    }

                    lista.push({
                        chaveUnica: texto.substring(0, 60),
                        textoBruto: texto,
                        linhas: linhasDetalhadas,
                        placar: placar
                    });
                }
            });

            const unicos = [];
            const vistos = new Set();
            for (const item of lista) {
                if (!vistos.has(item.chaveUnica)) {
                    vistos.add(item.chaveUnica);
                    unicos.push(item);
                }
            }
            return unicos;
        });

        console.log(`📊 Partidas detectadas no total: ${partidasExtraidas.length}`);
        let enviadosNoCiclo = 0;

        for (const jogo of partidasExtraidas) {
            let linhas = jogo.linhas;
            let liga = linhas.length > 0 ? linhas[0] : "Futebol Ao Vivo";

            // Verifica se o jogo pertence à Áustria (liga ou texto bruto da partida)
            const conteudoCompleta = `${liga} ${jogo.textoBruto}`;
            if (!ehFutebolAustria(conteudoCompleta)) {
                continue;
            }

            if (jogosEnviadosCache.has(jogo.chaveUnica)) continue;
            jogosEnviadosCache.add(jogo.chaveUnica);

            let tempoJogo = "Ao Vivo";
            for (const l of linhas) {
                if (l.includes("'") || l.includes("HT") || l.includes("FT") || /^\d{1,3}\s*['′]/.test(l)) {
                    tempoJogo = l;
                    break;
                }
            }

            let cardTelegram = `🏟 **Jogo:** <code>${jogo.textoBruto}</code>\n`;
            cardTelegram += `🏆 **Competição:** ${liga}\n`;
            cardTelegram += `⏱ **Tempo:** ${tempoJogo}\n`;
            cardTelegram += `⚽ **Resultado:** ${jogo.placar}\n`;
            cardTelegram += `⚔️ **Ataques Perigosos:** (Carregando live)\n`;
            cardTelegram += `⛳ **Cantos:** (Carregando live)\n`;
            cardTelegram += `⚖️ **Posse bola:** (Carregando live)`;

            await bot.sendMessage(CHAT_ID, cardTelegram, { parse_mode: 'HTML' }).catch(() => {});
            enviadosNoCiclo++;
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`✅ Ciclo concluído. ${enviadosNoCiclo} jogos da Áustria enviados.`);

    } catch (erro) {
        console.error("❌ Erro na varredura:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

varrerEEnviarAustria();
setInterval(varrerEEnviarAustria, 180000);
