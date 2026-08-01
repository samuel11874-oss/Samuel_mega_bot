const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Card Único ⚽🚩</h2>'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`));

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const memoriaJogos = new Map();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    return t.trim();
}

async function varrerPartidasAoVivo() {
    console.log("\n========================================");
    console.log("🕒 [BOT] Iniciando varredura unificada...");
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');

        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização...");
        await new Promise(r => setTimeout(r, 10000));

        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 600));
            await new Promise(r => setTimeout(r, 1500));
        }

        // Captura elementos isolados e únicos por partida usando seletores estruturados
        const dadosPartidas = await page.evaluate(() => {
            let cards = document.querySelectorAll('div');
            let unicos = new Set();
            let resultados = [];

            cards.forEach(el => {
                let texto = el.innerText ? el.innerText.trim() : '';
                // Filtra blocos que contêm formato de tempo exato de jogo e tamanho ideal de card
                if (/\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(texto) && texto.split('\n').length >= 4 && texto.length < 350) {
                    if (!unicos.has(texto)) {
                        unicos.add(texto);
                        resultados.push(texto.split('\n').map(l => l.trim()).filter(l => l.length > 0));
                    }
                }
            });

            return resultados;
        });

        console.log(`📊 Partidas brutas unicas capturadas: ${dadosPartidas.length}`);
        let enviados = 0;

        for (let linhas of dadosPartidas) {
            let linhaTempo = linhas.find(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(l));
            if (!linhaTempo) continue;

            let indexTempo = linhas.indexOf(linhaTempo);
            let liga = indexTempo >= 2 ? linhas[indexTempo - 2] : (indexTempo >= 1 ? linhas[indexTempo - 1] : "Futebol Ao Vivo");
            if (liga.length < 3 || /^\d+$/.test(liga) || liga.includes('%') || liga.toLowerCase().includes('todos')) {
                liga = "Futebol Ao Vivo";
            }

            let times = linhas.filter(l => 
                l.length > 2 && 
                !l.includes('%') && 
                !l.includes('.') && 
                !/^\d+$/.test(l) && 
                !/\b(\d{1,3}'|\d{1,3}\+\d+'|HT)\b/.test(l) &&
                !l.toLowerCase().includes('live') &&
                !l.toLowerCase().includes('todos') &&
                !l.toLowerCase().includes('próximos') &&
                !l.toLowerCase().includes('fim') &&
                !l.toLowerCase().includes('visão')
            );

            if (times.length < 2) continue;

            let timeCasa = times[0];
            let timeFora = times[1];
            let confronto = `${timeCasa} x ${timeFora}`;

            let numeros = linhas.filter(l => /^\d+$/.test(l));
            let golsCasa = numeros.length > 0 ? numeros[0] : "0";
            let golsFora = numeros.length > 1 ? numeros[1] : "1";
            let placar = `${golsCasa} x ${golsFora}`;

            // Chave baseada exclusivamente no confronto para garantir 1 único card por jogo
            let chaveConfronto = confronto.toLowerCase().replace(/\s+/g, '');
            
            // Se já enviamos este jogo, pula para evitar duplicidade de cards
            if (memoriaJogos.has(chaveConfronto)) {
                continue;
            }
            
            memoriaJogos.set(chaveConfronto, true);

            let card = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            card += `🏆 <b>Liga:</b> ${liga}\n`;
            card += `⏱ <b>Tempo:</b> ${traduzirTempo(linhaTempo)}\n`;
            card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
            card += `⚽ <b>Placar:</b> <b>${placar}</b>`;

            await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
            enviados++;
            console.log(`📤 Card Único Enviado | ${liga} | ${confronto} (${placar})`);
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`✅ Ciclo finalizado. ${enviados} cards únicos enviados.`);

    } catch (erro) {
        console.error(`❌ Erro crítico: ${erro.message}`);
    } finally {
        if (browser) await browser.close();
        console.log("========================================\n");
    }
}

varrerPartidasAoVivo();
setInterval(varrerPartidasAoVivo, 120000);
