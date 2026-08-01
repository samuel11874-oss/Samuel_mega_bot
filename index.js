const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Versão Cirúrgica Definitiva ⚽🚩</h2>'));
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
    console.log("🕒 [BOT] Iniciando varredura com Captura Avançada de Ligas...");
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

        const partidasRaw = await page.evaluate(() => {
            let results = [];
            // Varre os blocos principais de partidas (cards de jogos)
            let rows = document.querySelectorAll('div, tr, li, article');
            
            for (let row of rows) {
                let walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, null, false);
                let parts = [];
                let node;
                while (node = walker.nextNode()) {
                    let val = node.nodeValue.trim();
                    if (val && val.length > 0) {
                        parts.push(val);
                    }
                }
                
                let hasTime = parts.some(l => /\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l));
                let nums = parts.filter(l => /^\d+$/.test(l));
                let words = parts.filter(l => !/^\d+$/.test(l) && !/\b(\d{1,3}'|\d{1,3}\+\d+'|HT|INTERVALO)\b/i.test(l) && l.length > 2);
                
                if (hasTime && nums.length >= 2 && words.length >= 2 && parts.length < 25) {
                    // Tenta achar um título de liga nas proximidades superiores do DOM (elemento pai ou anterior)
                    let ligaDetectada = "Futebol Ao Vivo";
                    let parent = row.parentElement;
                    let tentativas = 0;
                    
                    while (parent && tentativas < 4) {
                        let prev = parent.previousElementSibling;
                        if (prev && prev.innerText && prev.innerText.trim().length > 2) {
                            let textoPrev = prev.innerText.trim().split('\n')[0];
                            if (textoPrev && textoPrev.length < 40 && !/\d+['"]/.test(textoPrev)) {
                                ligaDetectada = textoPrev;
                                break;
                            }
                        }
                        // Busca por títulos dentro do próprio bloco pai
                        let headers = parent.querySelectorAll('h1, h2, h3, h4, span, div');
                        for (let h of headers) {
                            let t = h.innerText ? h.innerText.trim() : '';
                            if (t.length > 2 && t.length < 40 && (t.includes(' - ') || t.includes('/') || h.className.includes('league') || h.className.includes('title') || h.className.includes('header'))) {
                                ligaDetectada = t.split('\n')[0];
                                break;
                            }
                        }
                        parent = parent.parentElement;
                        tentativas++;
                    }

                    results.push({ partes: parts, ligaContexto: ligaDetectada });
                }
            }
            return results;
        });

        console.log(`📊 Blocos brutos encontrados: ${partidasRaw.length}`);
        let enviados = 0;

        partidasRaw.sort((a, b) => a.partes.length - b.partes.length);
        let processados = new Set();

        for (let item of partidasRaw) {
            let partes = item.partes;
            let ligaContexto = item.ligaContexto;

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

            let timeCasa = "";
            let timeFora = "";
            let candidatosTimes = [];

            for (let i = textosLimpos.length - 1; i >= 0; i--) {
                let txt = textosLimpos[i];
                if (/^\d+([.,]\d+)?$/.test(txt)) continue;
                candidatosTimes.unshift(txt);
                if (candidatosTimes.length === 2) break;
            }

            if (candidatosTimes.length < 2) continue;

            timeCasa = candidatosTimes[0];
            timeFora = candidatosTimes[1];

            let liga = ligaContexto;
            if (!liga || liga === "Futebol Ao Vivo") {
                for (let i = 0; i < textosLimpos.length; i++) {
                    let txt = textosLimpos[i];
                    if (txt !== timeCasa && txt !== timeFora && !/^\d+([.,]\d+)?$/.test(txt)) {
                        liga = txt;
                        break;
                    }
                }
            }

            let timeCasaUp = timeCasa.toUpperCase();
            let timeForaUp = timeFora.toUpperCase();

            if (timeCasaUp === timeForaUp) continue;
            if (timeCasaUp.includes('CORNER') || timeForaUp.includes('CORNER')) continue;
            if (timeCasaUp.includes('BOTH') || timeForaUp.includes('BOTH')) continue;
            if (timeCasaUp.includes('TV') || timeForaUp.includes('TV')) continue;

            let confronto = `${timeCasa} x ${timeFora}`;
            let chaveConfronto = confronto.toLowerCase().replace(/\s+/g, '');

            if (processados.has(chaveConfronto)) continue;
            if (memoriaJogos.has(chaveConfronto)) continue;

            processados.add(chaveConfronto);
            memoriaJogos.set(chaveConfronto, true);

            let card = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            card += `🏆 <b>Liga:</b> ${liga}\n`;
            card += `⏱ <b>Tempo:</b> ${traduzirTempo(tempo)}\n`;
            card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
            card += `⚽ <b>Placar:</b> <b>${placar}</b>`;

            await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
            enviados++;
            console.log(`📤 CARD PERFEITO ENVIADO | [${liga}] ${confronto} (${placar})`);
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`✅ Ciclo finalizado. ${enviados} novos cards enviados.`);

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
setInterval(varrerPartidasAoVivo, 120000);
