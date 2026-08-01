const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - EscaScan Profissional V4 ⚽🚩</h2>'));
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
    console.log("🕒 [BOT] Iniciando varredura com Escaneamento de Estatísticas (Limite: 5 jogos)...");
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

        // Captura os links e dados básicos da lista principal para identificar as partidas
        const linksPartidas = await page.evaluate(() => {
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
                    // Tenta achar um link clicable dentro ou próximo ao card
                    let linkEl = row.querySelector('a') || row.closest('a');
                    let href = linkEl ? linkEl.href : null;
                    
                    list.push({ partes: parts, href: href });
                }
            }
            return list;
        });

        console.log(`📊 Partidas detectadas na lista: ${linksPartidas.length}`);
        let enviados = 0;
        let processadosLocal = new Set();

        // Limita o processamento a no máximo 5 jogos por ciclo para proteger o desempenho do Render
        let contadorLote = 0;

        for (let item of linksPartidas) {
            if (contadorLote >= 5) break;

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

            let timeCasaUp = timeCasa.toUpperCase();
            let timeForaUp = timeFora.toUpperCase();
            if (timeCasaUp === timeForaUp) continue;

            let confronto = `${timeCasa} x ${timeFora}`;
            let chaveConfronto = confronto.toLowerCase().replace(/\s+/g, '');

            if (processadosLocal.has(chaveConfronto)) continue;
            if (memoriaJogos.has(chaveConfronto)) continue;
            processadosLocal.add(chaveConfronto);
            memoriaJogos.set(chaveConfronto, true);

            contadorLote++;
            console.log(`🔍 [LOTE ${contadorLote}/5] Coletando estatísticas de: ${confronto}`);

            // Valores padrão caso a página interna demore ou mude o layout
            let escanteiosCasa = "0";
            let escanteiosFora = "0";
            let pressaoCasa = "N/D";
            let pressaoFora = "N/D";
            let ataquesPerigososCasa = "0";
            let ataquesPerigososFora = "0";

            // Se o bot encontrou um link direto para a partida, ele entra para raspar as estatísticas
            if (item.href) {
                try {
                    const pageJogo = await browser.newPage();
                    await pageJogo.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36');
                    await pageJogo.goto(item.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
                    await new Promise(r => setTimeout(r, 4000));

                    // Raspa dados estatísticos profundos da página interna do jogo
                    let stats = await pageJogo.evaluate(() => {
                        let data = { escantes: [], ataques: [], pressoes: [] };
                        let textosPagina = document.body.innerText.split('\n');
                        
                        // Varredura inteligente de termos-chave na página interna
                        textosPagina.forEach((txt, idx) => {
                            let tUp = txt.toUpperCase();
                            if (tUp.includes('ESCANTEIOS') || tUp.includes('CORNERS') || tUp.includes('CANTOS')) {
                                // Tenta capturar os números próximos nas linhas vizinhas
                                for (let j = Math.max(0, idx - 2); j <= Math.min(textosPagina.length - 1, idx + 2); j++) {
                                    let val = textosPagina[j].trim();
                                    if (/^\d+$/.test(val)) data.escantes.push(val);
                                }
                            }
                            if (tUp.includes('ATAQUES PERIGOSOS') || tUp.includes('ATTACKS')) {
                                for (let j = Math.max(0, idx - 2); j <= Math.min(textosPagina.length - 1, idx + 2); j++) {
                                    let val = textosPagina[j].trim();
                                    if (/^\d+$/.test(val)) data.ataques.push(val);
                                }
                            }
                        });
                        return data;
                    });

                    if (stats.escantes.length >= 2) {
                        escanteiosCasa = stats.escantes[0];
                        escanteiosFora = stats.escantes[1];
                    }
                    if (stats.ataques.length >= 2) {
                        ataquesPerigososCasa = stats.ataques[0];
                        ataquesPerigososFora = stats.ataques[1];
                    }

                    await pageJogo.close();
                } catch (e) {
                    console.log(`⚠️ Falha ao abrir link interno de ${confronto}: ${e.message}`);
                }
            }

            // Monta o Card Completo com Escanteios e Estatísticas solicitadas
            let card = `🟢 <b>SokkerPRO Scout Ao Vivo</b>\n\n`;
            card += `⏱ <b>Tempo:</b> ${traduzirTempo(tempo)}\n`;
            card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
            card += `⚽ <b>Placar:</b> <b>${placar}</b>\n\n`;
            card += `🚩 <b>Escanteios:</b> ${escanteiosCasa} x ${escanteiosFora}\n`;
            card += `⚡ <b>Ataques Perigosos:</b> ${ataquesPerigososCasa} x ${ataquesPerigososFora}\n`;

            await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
            enviados++;
            console.log(`📤 CARD ESTATÍSTICO ENVIADO | ${confronto} | Escanteios: ${escanteiosCasa}x${escanteiosFora}`);
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`✅ Ciclo finalizado. ${enviados} cards estatísticos enviados.`);

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
