const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Áustria Definitivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const jogosEnviadosCache = new Set();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    t = t.replace('MIN', 'min').replace('+', ' + ');
    return t.trim();
}

async function varrerEEnviarAustriaDefinitivo() {
    let browser = null;
    try {
        console.log("⚡ [Radar Áustria Definitivo] Conectando ao SokkerPRO...");

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
            const resultados = [];
            const blocos = document.querySelectorAll('div');

            blocos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';
                // Procura blocos que contenham estrutura de jogo ao vivo
                if (
                    texto.length > 15 && 
                    texto.length < 300 && 
                    (texto.includes(' - ') || texto.includes(' x ')) && 
                    (/\d{1,3}'/.test(texto) || texto.includes('HT') || texto.includes('FT'))
                ) {
                    resultados.push(texto);
                }
            });

            return [...new Set(resultados)];
        });

        console.log(`📊 Partidas brutas encontradas: ${partidasExtraidas.length}`);
        let enviadosNoCiclo = 0;

        for (let blocoTexto of partidasExtraidas) {
            // Filtro específico para Áustria
            if (!/austria|öfb|bundesliga|regionalliga|landesliga|cup/i.test(blocoTexto)) {
                continue;
            }

            let chaveUnica = blocoTexto.substring(0, 35);
            if (jogosEnviadosCache.has(chaveUnica)) continue;
            jogosEnviadosCache.add(chaveUnica);

            // Extração do Tempo
            let matchTempo = blocoTexto.match(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/i);
            let tempoJogo = matchTempo ? traduzirTempo(matchTempo[0]) : "Ao Vivo";

            // Extração da Liga
            let liga = "Áustria (Futebol Ao Vivo)";
            let linhas = blocoTexto.split('\n');
            if (linhas.length > 0 && /austria|öfb|bundesliga|regionalliga|landesliga|cup/i.test(linhas[0])) {
                liga = linhas[0].trim();
            }

            // Isola os times limpando o excesso de lixo e odds
            let timesConfronto = blocoTexto
                .replace(liga, '')
                .replace(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/g, '')
                .replace(/\d+%\s*\d+\s*\d+/g, '')
                .replace(/\b\d+\b/g, '')
                .replace(/[-–—]+/g, 'x')
                .replace(/\s+/g, ' ')
                .trim();

            if (!timesConfronto || timesConfronto.length < 3) {
                timesConfronto = blocoTexto;
            }

            // Card final limpo, organizado e no formato exato solicitado
            let cardTelegram = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            cardTelegram += `🏆 <b>Liga:</b> ${liga}\n`;
            cardTelegram += `⏱ <b>Tempo:</b> ${tempoJogo}\n`;
            cardTelegram += `⚽ <b>Confronto:</b> <code>${timesConfronto}</code>`;

            await bot.sendMessage(CHAT_ID, cardTelegram, { parse_mode: 'HTML' }).catch(() => {});
            enviadosNoCiclo++;
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`✅ Ciclo concluído. ${enviadosNoCiclo} cards limpos enviados.`);

    } catch (erro) {
        console.error("❌ Erro na varredura:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

varrerEEnviarAustriaDefinitivo();
setInterval(varrerEEnviarAustriaDefinitivo, 180000);
