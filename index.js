const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Definitivo ⚽🚩</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const memoriaPlacarJogos = new Map();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    return t.trim();
}

async function varrerDefinitivo() {
    let browser = null;
    try {
        console.log("⚡ [Scanner Definitivo] Conectando ao SokkerPRO...");

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
            waitUntil: 'networkidle2',
            timeout: 120000
        });

        console.log("⏳ Aguardando renderização total...");
        await new Promise(r => setTimeout(r, 12000)); 

        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        const partidasExtraidas = await page.evaluate(() => {
            const isTime = (s) => /^\d{1,3}'/i.test(s) || /^(HT|FT|Intervalo)$/i.test(s);
            
            const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let texts = [];
            let n;
            while (n = walk.nextNode()) {
                let val = n.nodeValue.replace(/\s+/g, ' ').trim();
                if (val.length > 0 && val !== '-' && val !== 'x' && val !== 'X' && !val.includes('Loading')) {
                    texts.push(val);
                }
            }

            let resultados = [];
            let i = 0;
            
            while (i < texts.length) {
                if (isTime(texts[i])) {
                    let matchData = {
                        tempo: texts[i],
                        league: (i > 0 && isNaN(texts[i-1]) && !texts[i-1].includes('%')) ? texts[i-1] : "Futebol Ao Vivo",
                        textos: []
                    };
                    
                    for (let j = 1; j <= 25; j++) {
                        if (i + j >= texts.length) break;
                        if (isTime(texts[i + j])) break; 
                        matchData.textos.push(texts[i + j]);
                    }
                    
                    resultados.push(matchData);
                    i += matchData.textos.length + 1;
                } else {
                    i++;
                }
            }
            
            let processados = [];
            
            for (let data of resultados) {
                let items = data.textos;
                
                // Procuramos o índice onde aparece a porcentagem da posse de bola
                let idxPorcentagem = items.findIndex(item => item.includes('%'));
                
                if (idxPorcentagem > 0) {
                    let timeCasa = items[idxPorcentagem - 1];
                    let timeFora = items[idxPorcentagem + 1];
                    
                    if (!timeCasa || !timeFora) continue;
                    
                    // Coleta os números inteiros que vêm logo após o time de fora (Gols e possivelmente Escanteios)
                    let numerosApos = [];
                    for (let k = idxPorcentagem + 2; k < items.length; k++) {
                        let val = items[k];
                        // Se encontrar odds com ponto decimal (ex: 2.10), paramos de coletar dados da partida
                        if (val.includes('.')) break;
                        if (/^\d+$/.test(val)) {
                            numerosApos.push(val);
                        }
                    }
                    
                    let golsCasa = numerosApos.length > 0 ? numerosApos[0] : "0";
                    let golsFora = numerosApos.length > 1 ? numerosApos[1] : "0";
                    
                    // Se houver mais números inteiros na sequência antes das odds, eles representam os escanteios
                    let escCasa = numerosApos.length > 2 ? numerosApos[2] : "0";
                    let escFora = numerosApos.length > 3 ? numerosApos[3] : "0";

                    processados.push({
                        liga: data.league,
                        tempo: data.tempo,
                        confronto: `${timeCasa} x ${timeFora}`,
                        placar: `${golsCasa} x ${golsFora}`,
                        escanteios: `${escCasa} x ${escFora}`
                    });
                }
            }
            return processados;
        });

        console.log(`📊 Partidas estruturadas com sucesso: ${partidasExtraidas.length}`);
        let enviadosNoCiclo = 0;

        for (let item of partidasExtraidas) {
            let chaveJogo = item.confronto.toLowerCase().replace(/\s+/g, '');

            if (memoriaPlacarJogos.has(chaveJogo)) {
                let placarAnterior = memoriaPlacarJogos.get(chaveJogo);
                if (placarAnterior === item.placar) {
                    continue; 
                }
            }
            memoriaPlacarJogos.set(chaveJogo, item.placar);

            let cardTelegram = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            if (item.liga && item.liga !== "Futebol Ao Vivo" && item.liga.length > 2) {
                cardTelegram += `🏆 <b>Liga:</b> ${item.liga}\n`;
            }
            cardTelegram += `⏱ <b>Tempo:</b> ${traduzirTempo(item.tempo)}\n`;
            cardTelegram += `⚔️ <b>Confronto:</b> <code>${item.confronto}</code>\n`;
            cardTelegram += `⚽ <b>Placar:</b> <b>${item.placar}</b>\n`;
            cardTelegram += `🚩 <b>Escanteios:</b> <b>${item.escanteios}</b>`;

            await bot.sendMessage(CHAT_ID, cardTelegram, { parse_mode: 'HTML' }).catch(() => {});
            enviadosNoCiclo++;
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`✅ Ciclo concluído. ${enviadosNoCiclo} cards enviados.`);

    } catch (erro) {
        console.error("❌ Erro na varredura:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

varrerDefinitivo();
setInterval(varrerDefinitivo, 180000);
