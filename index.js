const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Escanteios Cirúrgico ⚽🚩</h2>'));
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

async function varrerCirurgico() {
    let browser = null;
    try {
        console.log("⚡ [Scanner TreeWalker] Conectando ao SokkerPRO...");

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
            // Função para identificar se o texto é o relógio do jogo
            const isTime = (s) => /^\d{1,3}'/i.test(s) || /^(HT|FT|Intervalo)$/i.test(s) || /^\d{1,2}:\d{2}$/.test(s);
            
            // Pega TODOS os textos da página na exata ordem visual
            const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let texts = [];
            let n;
            while (n = walk.nextNode()) {
                let val = n.nodeValue.replace(/\s+/g, ' ').trim();
                // Ignora lixo de carregamento e caracteres inúteis
                if (
                    val.length > 0 && 
                    val !== '-' && val !== 'x' && val !== 'X' &&
                    !val.includes('Loading') && 
                    !val.includes('GAMEPLAY') &&
                    !val.includes('Subscribe') &&
                    !val.includes('ODDSPRE') &&
                    !val.includes('LIVE')
                ) {
                    texts.push(val);
                }
            }

            let resultados = [];
            let i = 0;
            
            while (i < texts.length) {
                if (isTime(texts[i])) {
                    let matchData = {
                        tempo: texts[i],
                        league: (i > 0 && isNaN(texts[i-1]) && !texts[i-1].includes('%')) ? texts[i-1] : "Desconhecida",
                        textos: []
                    };
                    
                    // Captura os próximos elementos até achar o próximo jogo
                    for (let j = 1; j <= 35; j++) {
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
                // Filtro hiper rigoroso: Arranca porcentagens e acréscimos
                let items = data.textos.filter(txt => 
                    !txt.includes('%') && 
                    !txt.toLowerCase().includes('min') && 
                    !txt.includes('+') && 
                    !txt.includes('ODDS') && 
                    !/^(Corners|Cantos|Cards|Yellow|Red|Pressure|Ataques|Attacks)$/i.test(txt)
                );
                
                let stringIndices = [];
                for (let k = 0; k < items.length; k++) {
                    if (isNaN(items[k]) && items[k].length > 2) {
                        stringIndices.push(k);
                    }
                }
                
                if (stringIndices.length >= 2) {
                    // Os dois últimos textos válidos são sempre os Times
                    let idxT1 = stringIndices[stringIndices.length - 2];
                    let idxT2 = stringIndices[stringIndices.length - 1];
                    
                    let timeCasa = items[idxT1];
                    let timeFora = items[idxT2];
                    
                    // Captura os números soltos baseados na posição dos times
                    let numsT1 = items.slice(idxT1 + 1, idxT2).filter(x => !isNaN(x) && x.trim() !== "");
                    let numsT2 = items.slice(idxT2 + 1).filter(x => !isNaN(x) && x.trim() !== "");
                    
                    let golsCasa = "0", escCasa = "0";
                    let golsFora = "0", escFora = "0";
                    
                    if (numsT1.length > 0) {
                        // Layout 1: Casa [números] Fora [números]
                        golsCasa = numsT1[0];
                        escCasa = numsT1.length > 1 ? numsT1[1] : "0"; // 2º número é o escanteio
                        
                        golsFora = numsT2.length > 0 ? numsT2[0] : "0";
                        escFora = numsT2.length > 1 ? numsT2[1] : "0";
                    } else if (numsT2.length >= 2) {
                        // Layout 2: Casa, Fora, [Todos os números]
                        golsCasa = numsT2[0];
                        golsFora = numsT2[1];
                        if (numsT2.length >= 4) {
                            escCasa = numsT2[2];
                            escFora = numsT2[3];
                        }
                    }
                    
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

        console.log(`📊 Jogos processados limpos: ${partidasExtraidas.length}`);
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
            if (item.liga && item.liga !== "Desconhecida" && item.liga.length > 3) {
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

        console.log(`✅ Ciclo concluído. ${enviadosNoCiclo} cards organizados enviados.`);

    } catch (erro) {
        console.error("❌ Erro na varredura:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

varrerCirurgico();
setInterval(varrerCirurgico, 180000);
