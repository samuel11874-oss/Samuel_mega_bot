const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Áustria Limpo & Perfeito ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const jogosEnviadosCache = new Set();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    // Substitui abreviações em inglês por português
    t = t.replace('MIN', 'min').replace('+', ' + ');
    return t.trim();
}

async function varrerEEnviarAustriaLimpa() {
    let browser = null;
    try {
        console.log("⚡ [Radar Áustria Limpo] Conectando ao SokkerPRO...");

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

        // Extração cirúrgica focada em linhas individuais de partidas
        const partidasExtraidas = await page.evaluate(() => {
            const resultados = [];
            // Procura por elementos que contenham estrutura de partidas ao vivo
            const elementos = document.querySelectorAll('div, span, p, a');

            elementos.forEach(el => {
                const texto = el.innerText ? el.innerText.trim() : '';
                // Identifica se a linha parece uma partida (contém traço de confronto e marcador de tempo ou placar)
                if (
                    texto.length > 10 && 
                    texto.length < 150 && 
                    (texto.includes(' - ') || texto.includes(' x ')) && 
                    (/\d{1,3}'/.test(texto) || texto.includes('HT') || text.includes('FT')) &&
                    /austria/i.test(document.body.innerText) // Garante contexto geral ou local
                ) {
                    resultados.push(texto);
                }
            });

            // Remove duplicados exatos
            return [...new Set(resultados)];
        });

        console.log(`📊 Partidas brutas encontradas: ${partidasExtraidas.length}`);
        let enviadosNoCiclo = 0;

        for (let linhaTexto of partidasExtraidas) {
            // Filtro rigoroso para pegar somente o que for da Áustria
            if (!/austria|öfb|bundesliga|regionalliga|landesliga|cup/i.test(linhaTexto)) {
                continue;
            }

            // Cria uma chave única baseada no texto do jogo para não repetir
            let chaveUnica = linhaTexto.substring(0, 40);
            if (jogosEnviadosCache.has(chaveUnica)) continue;
            jogosEnviadosCache.add(chaveUnica);

            // Limpeza e formatação inteligente das informações
            // Tenta extrair o minuto
            let matchTempo = linhaTexto.match(/(\d{1,3}'(?:\s*\+\s*\d+)?)/);
            let tempoJogo = matchTempo ? traduzirTempo(matchTempo[1]) : "Ao Vivo";

            // Tenta identificar o nome da liga (geralmente no começo da string)
            let liga = "Áustria (Futebol Ao Vivo)";
            if (linhaTexto.includes(':')) {
                let partesLiga = linhaTexto.split(':');
                liga = partesLiga[0].trim();
                linhaTexto = partesLiga.slice(1).join(':').trim();
            }

            // Limpa odds, números excessivos e lixo do placar/estatísticas da string dos times
            let timesConfronto = linhaTexto
                .replace(/\d{1,3}'/, '') // remove o minuto se sobrou
                .replace(/\d+%\s*\d+\s*\d+/, '') // remove porcentagens e números soltos
                .replace(/\b\d+\b\s*\b\d+\b/g, '') // remove placares isolados duplicados
                .replace(/\s+/g, ' ')
                .trim();

            if (!timesConfronto || timesConfronto.length < 3) {
                timesConfronto = linhaTexto; // Fallback se limpar demais
            }

            // Montagem do card extremamente limpo, organizado e com emojis alinhados
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

varrerEEnviarAustriaLimpa();
setInterval(varrerEEnviarAustriaLimpa, 180000);
