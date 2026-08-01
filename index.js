const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Scout Definitivo ⚽🚩</h2>'));
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
    console.log("🕒 [BOT] Iniciando varredura profunda com Scout Detalhado...");
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

        const dadosIniciais = await page.evaluate(() => {
            let list = [];
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
                
                if (hasTime && nums.length >= 2 && words.length >= 2 && parts.length < 25) {
                    let linkEl = row.querySelector('a') || row.closest('a');
                    let href = linkEl ? linkEl.href : null;
                    
                    // Tenta capturar a liga local
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

                    list.push({ partes: parts, href: href, ligaContexto: ligaDetectada });
                }
            }
            return list;
        });

        console.log(`📊 Partidas detectadas: ${dadosIniciais.length}`);
        let enviados = 0;
        let processadosLocal = new Set();
        let contadorLote = 0;

        for (let item of dadosIniciais) {
            if (contadorLote >= 5) break; // Mantém o limite de 5 por ciclo para garantir estabilidade

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
            console.log(`🔍 [LOTE ${contadorLote}/5] Abrindo página de: ${confronto}`);

            let escanteiosCasa = "0";
            let escanteiosFora = "0";
            let ataquesCasa = "0";
            let ataquesFora = "0";

            if (item.href) {
                try {
                    const pageJogo = await browser.newPage();
                    await pageJogo.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');
                    await pageJogo.goto(item.href, { waitUntil: 'domcontentloaded', timeout: 25000 });
                    await new Promise(r => setTimeout(r, 5000));

                    // Varre a página interna buscando blocos estatísticos de cantos e ataques
                    let estatisticasColetadas = await pageJogo.evaluate(() => {
                        let resultadosTextos = [];
                        let elementos = document.querySelectorAll('div, span, p, td, th');
                        elementos.forEach(el => {
                            let t = el.innerText ? el.innerText.trim() : '';
                            if (t.length > 0 && t.length < 20) {
                                resultadosTextos.push(t);
                            }
                        });
                        return resultadosTextos;
                    });

                    // Algoritmo para localizar os números de escanteios e ataques nas estatísticas internas
                    for (let idx = 0; idx < estatisticasColetadas.length; idx++) {
                        let txtUp = estatisticasColetadas[idx].toUpperCase();
                        
                        if (txtUp.includes('ESCANTEIO') || txtUp.includes('CANTOS') || txtUp === 'CORNER' || txtUp === 'CORNERS') {
                            // Olha os elementos próximos para pegar os dois valores numéricos (Casa e Fora)
                            let numsEncontrados = [];
                            for (let k = Math.max(0, idx - 4); k <= Math.min(estatisticasColetadas.length - 1, idx + 4); k++) {
                                if (/^\d+$/.test(estatisticasColetadas[k])) {
                                    numsEncontrados.push(estatisticasColetadas[k]);
                                }
                            }
                            if (numsEncontrados.length >= 2) {
                                escanteiosCasa = numsEncontrados[0];
                                escanteiosFora = numsEncontrados[1];
                            }
                        }

                        if (txtUp.includes('ATAQUES PERIGOSOS') || txtUp.includes('ATTACKS')) {
                            let numsAtaque = [];
                            for (let k = Math.max(0, idx - 4); k <= Math.min(estatisticasColetadas.length - 1, idx + 4); k++) {
                                if (/^\d+$/.test(estatisticasColetadas[k])) {
                                    numsAtaque.push(estatisticasColetadas[k]);
                                }
                            }
                            if (numsAtaque.length >= 2) {
                                ataquesCasa = numsAtaque[0];
                                ataquesFora = numsAtaque[1];
                            }
                        }
                    }

                    await pageJogo.close();
                } catch (e) {
                    console.log(`⚠️ Erro ao rasprar estatísticas internas: ${e.message}`);
                }
            }

            let liga = item.ligaContexto;
            if (!liga || liga.length > 40) liga = "Futebol Ao Vivo";

            // Monta o card completo solicitada
            let card = `🟢 <b>SokkerPRO Scout Ao Vivo</b>\n\n`;
            card += `🏆 <b>Liga:</b> ${liga}\n`;
            card += `⏱ <b>Tempo:</b> ${traduzirTempo(tempo)}\n`;
            card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
            card += `⚽ <b>Placar:</b> <b>${placar}</b>\n\n`;
            card += `🚩 <b>Escanteios:</b> ${escanteiosCasa} x ${escanteiosFora}\n`;
            card += `⚡ <b>Ataques Perigosos:</b> ${ataquesCasa} x ${ataquesFora}`;

            await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
            enviados++;
            console.log(`📤 CARD COMPLETO ENVIADO | ${confronto} | Cantos: ${escanteiosCasa}x${escanteiosFora}`);
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
