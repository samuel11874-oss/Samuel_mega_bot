const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Formato Limpo Final ⚽</h2>'));
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

async function varrerEEnviarLimpoFinal() {
    let browser = null;
    try {
        console.log("⚡ [Radar Limpo Final] Conectando ao SokkerPRO...");

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
            let chaveUnica = blocoTexto.substring(0, 35);
            if (jogosEnviadosCache.has(chaveUnica)) continue;
            jogosEnviadosCache.add(chaveUnica);

            // 1. Extração correta do Tempo
            let matchTempo = blocoTexto.match(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/i);
            let tempoJogo = matchTempo ? traduzirTempo(matchTempo[0]) : "Ao Vivo";

            // 2. Extração limpa e real da Liga (separa antes dos dois pontos ou pega a linha inicial)
            let liga = "Futebol Ao Vivo";
            if (blocoTexto.includes(':')) {
                let partes = blocoTexto.split(':');
                if (partes[0].length > 2 && partes[0].length < 40) {
                    liga = partes[0].trim();
                }
            }

            // 3. Extração limpa do Placar
            let matchPlacar = blocoTexto.match(/\b([0-9])\b\s*[-–—]\s*\b([0-9])\b/);
            let placarJogo = matchPlacar ? `${matchPlacar[1]} x ${matchPlacar[2]}` : "0 x 0";

            // 4. Limpeza cirúrgica para isolar apenas os dois times (ex: Real Madrid x Barcelona)
            let textoLimpo = blocoTexto
                .replace(liga, '')
                .replace(/[:]/g, '')
                .replace(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/g, '')
                .replace(/\d+%\s*\d+\s*\d+/g, '')
                .replace(/\b[0-9]\b\s*[-–—]\s*\b[0-9]\b/g, '')
                .replace(/\b\d+\b/g, '')
                .replace(/[%]/g, '')
                .replace(/[-–—]+/g, 'x')
                .replace(/\s+/g, ' ')
                .trim();

            // Tenta organizar os times dividindo pelo 'x' ou limpando repetições indesejadas
            let partesTimes = textoLimpo.split(' x ');
            let timeA = partesTimes[0] ? partesTimes[0].trim() : "";
            let timeB = partesTimes[1] ? partesTimes[1].trim() : "";

            // Se limpou demais ou ficou vazio, usa uma alternativa limpa
            let confrontoFinal = (timeA && timeB) ? `${timeA} x ${timeB}` : textoLimpo;
            if (!confrontoFinal || confrontoFinal.length < 3) continue;

            // Montagem final do card perfeito
            let cardTelegram = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            cardTelegram += `🏆 <b>Liga:</b> ${liga}\n`;
            cardTelegram += `⏱ <b>Tempo:</b> ${tempoJogo}\n`;
            cardTelegram += `⚔️ <b>Confronto:</b> <code>${confrontoFinal}</code>\n`;
            cardTelegram += `⚽ <b>Placar:</b> <b>${placarJogo}</b>`;

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

varrerEEnviarLimpoFinal();
setInterval(varrerEEnviarLimpoFinal, 180000);
