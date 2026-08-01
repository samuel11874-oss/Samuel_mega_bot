const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Scout Direto V6 ⚽🚩</h2>'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`));

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const memoriaJogos = new Map();

function traduzirTempo(texto) {
    if (!texto) return 'Desconhecido';
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    return t.trim();
}

async function varrerPartidasAoVivo() {
    console.log("\n========================================");
    console.log("🕒 [BOT] Iniciando varredura e extração de scout...");
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

        console.log("⏳ Navegando até o site...");
        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização do conteúdo...");
        await new Promise(r => setTimeout(r, 12000));

        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        // Extração unificada e direta dos blocos de partidas contendo números estatísticos visíveis na tela
        const partidasExtraidas = await page.evaluate(() => {
            let results = [];
            let rows = document.querySelectorAll('div, tr, li, article');
            
            for (let row of rows) {
                let walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, null, false);
                let parts = [];
                let node;
                while (node = walker.nextNode()) {
                    let val = node.nodeValue.trim();
                    if (val && val.length > 0) parts.push(val);
                }
                
                let hasTime = parts.some(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l));
                let nums = parts.filter(l => /^\d+$/.test(l));
                let words = parts.filter(l => !/^\d+$/.test(l) && !/\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l) && l.length > 2);
                
                // Critério refinado para capturar blocos de partidas válidos
                if (hasTime && nums.length >= 2 && words.length >= 2 && parts.length < 30) {
                    
                    let ligaDetectada = "Futebol Ao Vivo";
                    let prevEl = row.previousElementSibling;
                    let tentativas = 0;
                    while (prevEl && tentativas < 2) {
                        let textoPrev = prevEl.innerText ? prevEl.innerText.trim().split('\n')[0] : '';
                        if (textoPrev && textoPrev.length > 2 && textoPrev.length < 45 && !/\d+['"]/.test(textoPrev) && !/^\d+$/.test(textoPrev)) {
                            ligaDetectada = textoPrev;
                            break;
                        }
                        prevEl = prevEl.previousElementSibling;
                        tentativas++;
                    }

                    results.push({ partes: parts, ligaContexto: ligaDetectada });
                }
            }
            return results;
        });

        console.log(`📊 Blocos brutos detectados: ${partidasExtraidas.length}`);
        let enviados = 0;
        let processadosLocal = new Set();
        let contadorLote = 0;

        for (let item of partidasExtraidas) {
            if (contadorLote >= 5) break; // Limite rigoroso de 5 jogos por ciclo

            let partes = item.partes;
            let tempo = partes.find(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l));
            let numeros = partes.filter(l => /^\d+$/.test(l));
            if (numeros.length < 2) continue;

            let golsCasa = numeros[0];
            let golsFora = numeros[1];
            let placar = `${golsCasa} x ${golsFora}`;

            let textosLimpos = partes.filter(p => {
                let up = p.toUpperCase();
                return p !== tempo && 
                       !/^\d+$/.test(p) && 
                       p.length > 2 &&
                       !/^\d+[.,]\d+$/.test(p) && 
                       !up.includes('VISÃO') && 
                       !up.includes('ODDS') && 
                       !up.includes('LIVE') && 
                       !up.includes('PLAY WITH RESPONSIBILITY') &&
                       !up.includes('CORNERS') &&
                       !up.includes('TV CHANNELS') &&
                       !up.includes('NO TV') &&
                       !p.includes('%');
            });

            if (textosLimpos.length < 2) continue;

            let candidatosTimes = [];
            for (let i = textosLimpos.length - 1; i >= 0; i--) {
                let txt = textosLimpos[i];
                if (/^\d+([.,]\d+)?$/.test(txt)) continue;
                candidatosTimes.unshift(txt);
                if (candidatosTimes.length === 2) break;
            }

            if (candidatosTimes.length < 2) continue;
            let timeCasa = candidatosTimes[0];
            let timeFora = candidatosTimes[1];

            if (timeCasa.toUpperCase() === timeFora.toUpperCase()) continue;
            if (timeCasa.includes('GOALS') || timeFora.includes('BOTH')) continue;

            let confronto = `${timeCasa} x ${timeFora}`;
            let chaveConfronto = confronto.toLowerCase().replace(/\s+/g, '');

            if (processadosLocal.has(chaveConfronto)) continue;
            if (memoriaJogos.has(chaveConfronto)) continue;
            processadosLocal.add(chaveConfronto);
            memoriaJogos.set(chaveConfronto, true);

            contadorLote++;

            // Varredura inteligente de números adicionais na matriz do bloco para preencher escanteios e ataques quando presentes na tela
            let escanteiosCasa = "0";
            let escanteiosFora = "0";
            let ataquesCasa = "0";
            let ataquesFora = "0";

            // Se houver números extras na listagem além dos gols, mapeia para as estatísticas
            let numerosExtras = numeros.slice(2);
            if (numerosExtras.length >= 2) {
                escanteiosCasa = numerosExtras[0];
                escanteiosFora = numerosExtras[1];
            }
            if (numerosExtras.length >= 4) {
                ataquesCasa = numerosExtras[2];
                ataquesFora = numerosExtras[3];
            }

            let liga = item.ligaContexto;
            if (!liga || liga.length > 40) liga = "Futebol Ao Vivo";

            let card = `🟢 <b>SokkerPRO Scout Ao Vivo</b>\n\n`;
            card += `🏆 <b>Liga:</b> ${liga}\n`;
            card += `⏱ <b>Tempo:</b> ${traduzirTempo(tempo)}\n`;
            card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
            card += `⚽ <b>Placar:</b> <b>${placar}</b>\n\n`;
            card += `🚩 <b>Escanteios:</b> ${escanteiosCasa} x ${escanteiosFora}\n`;
            card += `⚡ <b>Ataques Perigosos:</b> ${ataquesCasa} x ${ataquesFora}`;

            await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
            enviados++;
            console.log(`📤 CARD ENVIADO | ${confronto} | Cantos: ${escanteiosCasa}x${escanteiosFora}`);
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`✅ Ciclo finalizado. ${enviados} cards enviados.`);

    } catch (erro) {
        console.error(`❌ Erro crítico: ${erro.message}`);
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
        console.log("========================================\n");
    }
}

varrerPartidasAoVivo();
setInterval(varrerPartidasAoVivo, 180000);
