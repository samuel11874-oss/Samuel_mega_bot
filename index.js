const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Filtro Definitivo ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const jogosEnviadosCache = new Set();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    t = t.replace('MIN', 'min').replace('+', ' + ');
    return t.trim();
}

async function varrerEEnviarFiltroDefinitivo() {
    let browser = null;
    try {
        console.log("⚡ [Radar Definitivo] Conectando ao SokkerPRO...");

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

        const partidasExtraidas = await page.evaluate(() => {
            const listaJogos = [];
            const elementos = document.querySelectorAll('div');
            
            elementos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';
                
                // Pega apenas blocos que parecem partidas reais e rejeita propagandas
                if (
                    texto.length > 20 && 
                    texto.length < 250 && 
                    (/\d{1,3}'/.test(texto) || texto.includes('HT') || texto.includes('FT')) &&
                    (texto.includes('-') || texto.includes('x')) &&
                    !texto.includes('ODDS') &&
                    !texto.includes('Subscribe') &&
                    !texto.includes('RESPONSIBILITY')
                ) {
                    listaJogos.push(texto);
                }
            });

            return [...new Set(listaJogos)];
        });

        console.log(`📊 Partidas válidas encontradas: ${partidasExtraidas.length}`);
        let enviadosNoCiclo = 0;

        for (let blocoTexto of partidasExtraidas) {
            let chaveUnica = blocoTexto.substring(0, 30);
            if (jogosEnviadosCache.has(chaveUnica)) continue;
            jogosEnviadosCache.add(chaveUnica);

            // 1. Extração do Tempo
            let matchTempo = blocoTexto.match(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/i);
            let tempoJogo = matchTempo ? traduzirTempo(matchTempo[0]) : "Ao Vivo";

            // 2. Extração limpa da Liga (Procura por termos de países/campeonatos comuns no topo)
            let linhas = blocoTexto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let liga = "Futebol Ao Vivo";

            for (let linha of linhas) {
                let lUpper = linha.toUpperCase();
                if (
                    (lUpper.includes('GERMANY') || lUpper.includes('AUSTRIA') || lUpper.includes('MEXICO') || 
                     lUpper.includes('IRELAND') || lUpper.includes('BRAZIL') || lUpper.includes('LEAGUE') || 
                     lUpper.includes('OBERLIGA') || lUpper.includes('REGIONALLIGA') || lUpper.includes('PREMIERSHIP') ||
                     lUpper.includes('CHAMPIONSHIP') || lUpper.includes('CUP')) &&
                    !lUpper.includes("'") && !lUpper.includes("X")
                ) {
                    liga = linha;
                    break;
                }
            }

            // Se não achou pelos termos-chave, pega a primeira linha limpa que não seja tempo ou placar
            if (liga === "Futebol Ao Vivo" && linhas.length > 0) {
                for (let linha of linhas) {
                    if (linha.length > 3 && !/\d{1,3}'/.test(linha) && !/\d+\s*x\s*\d+/.test(linha) && !/%/.test(linha)) {
                        liga = linha;
                        break;
                    }
                }
            }

            // Limpa lixos residuais da liga
            liga = liga.replace(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/gi, '').trim();
            if (liga.length > 40) liga = "Futebol Ao Vivo";

            // 3. Extração real do Placar
            let matchPlacar = blocoTexto.match(/\b([0-9])\s*[-–—xX]\s*([0-9])\b/);
            let placarJogo = matchPlacar ? `${matchPlacar[1]} x ${matchPlacar[2]}` : "0 x 0";

            // 4. Limpeza rigorosa dos Times
            let limpo = blocoTexto;
            if (liga !== "Futebol Ao Vivo") limpo = limpo.replace(liga, '');
            if (matchTempo) limpo = limpo.replace(matchTempo[0], '');
            
            limpo = limpo.replace(/\d+%/g, '');
            limpo = limpo.replace(/\b([0-9])\s*[-–—xX]\s*([0-9])\b/g, '');
            
            // Separa os times removendo números soltos e pontuações excessivas
            let pedacos = limpo.split(/[-–—]|vs/i).map(p => p.replace(/[\d%]/g, '').trim()).filter(p => p.length > 2);

            let confrontoFinal = "";
            if (pedacos.length >= 2) {
                confrontoFinal = `${pedacos[0]} x ${pedacos[1]}`;
            } else {
                confrontoFinal = limpo.replace(/\s+/g, ' ').trim();
                confrontoFinal = confrontoFinal.replace(/^[x\s-]+|[x\s-]+$/g, '');
            }

            if (!confrontoFinal || confrontoFinal.length < 5 || confrontoFinal.includes('x x')) continue;

            // Montagem do card final padronizado
            let cardTelegram = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            cardTelegram += `🏆 <b>Liga:</b> ${liga}\n`;
            cardTelegram += `⏱ <b>Tempo:</b> ${tempoJogo}\n`;
            cardTelegram += `⚔️ <b>Confronto:</b> <code>${confrontoFinal}</code>\n`;
            cardTelegram += `⚽ <b>Placar:</b> <b>${placarJogo}</b>`;

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

varrerEEnviarFiltroDefinitivo();
setInterval(varrerEEnviarFiltroDefinitivo, 180000);
