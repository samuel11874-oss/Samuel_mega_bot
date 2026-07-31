const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Seletor DOM ⚽🚩</h2>'));
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

async function varrerPorDOM() {
    let browser = null;
    try {
        console.log("⚡ [Scanner DOM] Conectando ao SokkerPRO...");

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

        console.log("⏳ Aguardando carregamento dos elementos...");
        await new Promise(r => setTimeout(r, 12000)); 

        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        const partidasExtraidas = await page.evaluate(() => {
            let listaJogos = [];
            
            // Varre o DOM buscando blocos que costumam conter as partidas
            // Como sites mobile usam divs genéricas, vamos procurar elementos que contêm relógios de tempo (')
            const allElements = document.querySelectorAll('div, span, p, a');
            
            allElements.forEach(el => {
                let text = el.innerText ? el.innerText.trim() : '';
                // Identifica se o elemento é o relógio de uma partida em Andamento ou Intervalo
                if (/^\d{1,3}'$/.test(text) || text === 'HT' || text === 'Intervalo') {
                    // Sobe na árvore de elementos para tentar encontrar o container principal da partida
                    let container = el.closest('div');
                    if (container && container.innerText.length > 20 && container.innerText.length < 500) {
                        let blocoTexto = container.innerText;
                        
                        // Extração interna do bloco
                        let linhas = blocoTexto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        
                        let tempo = text;
                        let liga = "Futebol Ao Vivo";
                        let times = [];
                        let numeros = [];
                        
                        linhas.forEach(l => {
                            if (/^\d{1,3}'$/.test(l) || l === 'HT' || l === 'Intervalo') return;
                            if (l.includes('%')) return; // descarta posse
                            if (l.includes('ODDS') || l.includes('PRE')) return;
                            
                            // Se for número puro com ponto decimal, é odd
                            if (l.includes('.')) return;
                            
                            if (/^\d+$/.test(l)) {
                                numeros.push(l);
                            } else if (l.length > 2 && !l.includes('BOLIVIA') && !l.includes('BRAZIL') && !l.includes('ARGENTINA')) {
                                times.push(l);
                            }
                        });
                        
                        if (times >= 2 || (times.length >= 2 && numeros.length >= 2)) {
                            // Pega os dois primeiros times limpos
                            let timeCasa = times[0];
                            let timeFora = times[1];
                            
                            // Placar e Escanteios baseados nos números capturados no container
                            let golsCasa = numeros.length > 0 ? numeros[0] : "0";
                            let golsFora = numeros.length > 1 ? numeros.length > 3 ? numeros[1] : numeros[1] : "0";
                            
                            // Se o site joga os escanteios logo após os gols
                            let escCasa = numeros.length > 2 ? numeros[2] : "0";
                            let escFora = numeros.length > 3 ? numeros[3] : "0";
                            
                            let confrontoStr = `${timeCasa} x ${timeFora}`;
                            
                            // Evita duplicatas no mesmo bloco
                            if (!listaJogos.some(j => j.confronto === confrontoStr)) {
                                listaJogos.push({
                                    liga: liga,
                                    tempo: tempo,
                                    confronto: confrontoStr,
                                    placar: `${golsCasa} x ${golsFora}`,
                                    escanteios: `${escCasa} x ${escFora}`
                                });
                            }
                        }
                    }
                }
            });
            
            return listaJogos;
        });

        console.log(`📊 Partidas estruturadas via DOM: ${partidasExtraidas.length}`);
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
            if (item.liga && item.liga !== "Futebol Ao Vivo") {
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
        console.error("❌ Erro na varredura DOM:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

varrerPorDOM();
setInterval(varrerPorDOM, 180000);
