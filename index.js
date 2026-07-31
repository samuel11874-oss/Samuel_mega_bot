const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Escanteios Reais ⚽🚩</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const memoriaPlacarJogos = new Map();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    t = t.replace('MIN', 'min').replace('+', ' + ');
    return t.trim();
}

async function varrerEEnviarEscanteiosReais() {
    let browser = null;
    try {
        console.log("⚡ [Radar Escanteios Reais] Conectando ao SokkerPRO...");

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

        console.log("⏳ Aguardando carregamento total dos dados e scripts dinâmicos...");
        await new Promise(r => setTimeout(r, 9000)); // Tempo maior para sumir o "Loading data..."

        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        const partidasExtraidas = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('div');

            blocos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';

                // Filtro hiper-rigoroso para barrar propagandas e estados de carregamento (Loading)
                if (
                    texto.length > 30 &&
                    texto.length < 400 &&
                    (/\d{1,3}'/.test(texto) || texto.includes('HT') || texto.includes('FT')) &&
                    (texto.includes('x') || texto.includes('-')) &&
                    !texto.includes('Loading data') &&
                    !texto.includes('ODDSLIVE') &&
                    !texto.includes('ODDSPRE') &&
                    !texto.includes('Subscribe') &&
                    !texto.includes('RESPONSIBILITY') &&
                    !texto.includes('AVERAGESLAST') &&
                    !texto.includes('CHANNELS') &&
                    !texto.includes('GAMEPLAY')
                ) {
                    let linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    let ligaEncontrada = "";
                    
                    for (let linha of linhas) {
                        let lUp = linha.toUpperCase();
                        if (
                            (lUp.includes('COLOMBIA') || lUp.includes('ARGENTINA') || lUp.includes('BRAZIL') || 
                             lUp.includes('GERMANY') || lUp.includes('SPAIN') || lUp.includes('ITALY') || 
                             lUp.includes('ENGLAND') || lUp.includes('MEXICO') || lUp.includes('LEAGUE') || 
                             lUp.includes('PRIMERA') || lUp.includes('CHAMPIONSHIP') || lUp.includes('PREMIERSHIP') || 
                             lUp.includes('OBERLIGA') || lUp.includes('REGIONALLIGA') || lUp.includes('CUP') || 
                             lUp.includes('WOMEN') || lUp.includes('PRO') || lUp.includes('JUNIOR')) &&
                            !lUp.includes("'") && !lUp.includes("X") && lUp.length < 45
                        ) {
                            ligaEncontrada = linha;
                            break;
                        }
                    }

                    resultados.push({
                        textoBloco: texto,
                        liga: ligaEncontrada || ""
                    });
                }
            });

            return resultados;
        });

        console.log(`📊 Partidas limpas e válidas encontradas: ${partidasExtraidas.length}`);
        let enviadosNoCiclo = 0;

        for (let item of partidasExtraidas) {
            let bloco = item.textoBloco;
            let liga = item.liga;

            let matchTempo = bloco.match(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/i);
            let tempoJogo = matchTempo ? traduzirTempo(matchTempo[0]) : "Ao Vivo";

            let placarJogo = "0 x 0";
            let matchPlacar = bloco.match(/\b([0-5])\s*[-–—xX]\s*([0-5])\b/);
            if (matchPlacar) {
                placarJogo = `${matchPlacar[1]} x ${matchPlacar[2]}`;
            }

            // Extração refinada de Escanteios buscando padrões numéricos isolados próximos a termos de canto ou estatística
            let escanteiosJogo = "0 x 0";
            let matchEscantes = bloco.match(/(?:cantos?|corners?)\D*([0-9]{1,2})\D*([0-9]{1,2})/i);
            if (matchEscantes) {
                escanteiosJogo = `${matchEscantes[1]} x ${matchEscantes[2]}`;
            } else {
                // Tenta varrer pares de números que representem os cantos no padrão do layout mobile do SokkerPRO
                let digitosLinhados = bloco.match(/\b([0-1]?[0-9])\s*[–—-]\s*([0-1]?[0-9])\b/g);
                if (digitosLinhados && digitosLinhados.length > 1) {
                    // O segundo par geralmente representa os cantos após o placar
                    let partesCantos = digitosLinhados[1].split(/[-–—]/);
                    if (partesCantos.length === 2) {
                        escanteiosJogo = `${partesCantos[0].trim()} x ${partesCantos[1].trim()}`;
                    }
                }
            }

            let limpo = bloco;
            if (liga) limpo = limpo.replace(liga, '');
            if (matchTempo) limpo = limpo.replace(matchTempo[0], '');
            
            limpo = limpo.replace(/\d+%/g, '');
            limpo = limpo.replace(/\b([0-5])\s*[-–—xX]\s*([0-5])\b/g, '');
            limpo = limpo.replace(/\b\d+\.\d{2}\b/g, '');

            let pedacos = limpo.split(/[-–—]|vs/i).map(p => p.replace(/[\d%]/g, '').trim()).filter(p => p.length > 2);

            let confrontoFinal = "";
            if (pedacos.length >= 2) {
                confrontoFinal = `${pedacos[0]} x ${pedacos[1]}`;
            } else {
                confrontoFinal = limpo.replace(/\s+/g, ' ').trim();
                confrontoFinal = confrontoFinal.replace(/^[x\s-]+|[x\s-]+$/g, '');
            }

            if (!confrontoFinal || confrontoFinal.length < 5 || confrontoFinal.includes('x x')) continue;

            let chaveJogo = confrontoFinal.toLowerCase().replace(/\s+/g, '');

            if (memoriaPlacarJogos.has(chaveJogo)) {
                let placarAnterior = memoriaPlacarJogos.get(chaveJogo);
                if (placarAnterior === placarJogo) {
                    continue; 
                } else {
                    console.log(`⚽ GOL DETECTADO em ${confrontoFinal}! Placar anterior: ${placarAnterior} -> Novo: ${placarJogo}`);
                }
            }

            memoriaPlacarJogos.set(chaveJogo, placarJogo);

            let cardTelegram = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            if (liga) {
                cardTelegram += `🏆 <b>Liga:</b> ${liga}\n`;
            }
            cardTelegram += `⏱ <b>Tempo:</b> ${tempoJogo}\n`;
            cardTelegram += `⚔️ <b>Confronto:</b> <code>${confrontoFinal}</code>\n`;
            cardTelegram += `⚽ <b>Placar:</b> <b>${placarJogo}</b>\n`;
            cardTelegram += `🚩 <b>Escanteios:</b> <b>${escanteiosJogo}</b>`;

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

varrerEEnviarEscanteiosReais();
setInterval(varrerEEnviarEscanteiosReais, 180000);
