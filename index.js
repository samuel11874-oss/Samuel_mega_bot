const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Extração Cirúrgica ⚽</h2>'));
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

async function varrerEEnviarCirurgico() {
    let browser = null;
    try {
        console.log("⚡ [Radar Cirúrgico] Conectando ao SokkerPRO...");

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

        // Extração isolada por blocos de cards de partidas reais
        const partidasExtraidas = await page.evaluate(() => {
            const resultados = [];
            
            // Varre elementos que costumam englobar uma partida inteira no layout mobile
            const cards = document.querySelectorAll('div');

            cards.forEach(card => {
                const textoCompleto = card.innerText ? card.innerText.replace(/\s+/g, ' ').trim() : '';

                // Valida se o bloco contém tempo de jogo e odds/placar, descartando lixo e propagandas
                if (
                    textoCompleto.length > 25 &&
                    textoCompleto.length < 300 &&
                    (/\d{1,3}'/.test(textoCompleto) || textoCompleto.includes('HT') || textoCompleto.includes('FT')) &&
                    (textoCompleto.includes('x') || textoCompleto.includes('-')) &&
                    !textoCompleto.includes('ODDSLIVE') &&
                    !textoCompleto.includes('Subscribe') &&
                    !textoCompleto.includes('RESPONSIBILITY')
                ) {
                    resultados.push(textoCompleto);
                }
            });

            return [...new Set(resultados)];
        });

        console.log(`📊 Partidas estruturadas encontradas: ${partidasExtraidas.length}`);
        let enviadosNoCiclo = 0;

        for (let bloco of partidasExtraidas) {
            let chaveUnica = bloco.substring(0, 35);
            if (jogosEnviadosCache.has(chaveUnica)) continue;
            jogosEnviadosCache.add(chaveUnica);

            // 1. Extração do Tempo de Jogo
            let matchTempo = bloco.match(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/i);
            let tempoJogo = matchTempo ? traduzirTempo(matchTempo[0]) : "Ao Vivo";

            // 2. Extração limpa e inteligente da Liga
            let linhas = bloco.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let liga = "Futebol Ao Vivo";

            for (let linha of linhas) {
                let lUp = linha.toUpperCase();
                // Procura por padrões que identifiquen ligas, países ou divisões no topo do bloco
                if (
                    (lUp.includes('GERMANY') || lUp.includes('AUSTRIA') || lUp.includes('MEXICO') || 
                     lUp.includes('IRELAND') || lUp.includes('BRAZIL') || lUp.includes('LEAGUE') || 
                     lUp.includes('OBERLIGA') || lUp.includes('REGIONALLIGA') || lUp.includes('PREMIERSHIP') ||
                     lUp.includes('CHAMPIONSHIP') || lUp.includes('CUP') || lUp.includes('JUNIROEN') || lUp.includes('WOMEN')) &&
                    !lUp.includes("'") && !lUp.includes("X") && lUp.length < 50
                ) {
                    liga = linha;
                    break;
                }
            }

            // Fallback para pegar a primeira linha válida caso o filtro acima não pegue
            if (liga === "Futebol Ao Vivo" && linhas.length > 0) {
                for (let linha of linhas) {
                    if (
                        linha.length > 3 && 
                        !/\d{1,3}'/.test(linha) && 
                        !/\d+\s*x\s*\d+/.test(linha) && 
                        !/%/.test(linha) &&
                        !linha.toUpperCase().includes('MIN')
                    ) {
                        liga = linha;
                        break;
                    }
                }
            }
            liga = liga.replace(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/gi, '').trim();
            if (liga.length > 45) liga = "Futebol Ao Vivo";

            // 3. Extração correta do Placar Real (Procura padrão numérico isolado de gols dentro do texto)
            let placarJogo = "0 x 0";
            // Procura por números de placar típicos colados antes de odds ou isolados (Ex: "2 0" ou "1 - 0" ou "3 x 0")
            let matchPlacarExplicito = bloco.match(/\b([0-5])\s*[-–—xX]\s*([0-5])\b/);
            
            if (matchPlacarExplicito) {
                placarJogo = `${matchPlacarExplicito[1]} x ${matchPlacarExplicito[2]}`;
            } else {
                // Tenta achar dígitos sequenciais que representem o placar ao lado dos nomes dos times
                let numerosEmSequencia = bloco.match(/\b([0-5])\s+([0-5])\b/);
                if (numerosEmSequencia) {
                    placarJogo = `${numerosEmSequencia[1]} x ${numerosEmSequencia[2]}`;
                }
            }

            // 4. Limpeza rigorosa do Confronto (Remove liga, tempo, placar embutido e percentuais)
            let limpo = bloco;
            if (liga !== "Futebol Ao Vivo") limpo = limpo.replace(liga, '');
            if (matchTempo) limpo = limpo.replace(matchTempo[0], '');
            
            limpo = limpo.replace(/\d+%/g, ''); // Remove odds em porcentagem
            limpo = limpo.replace(/\b([0-5])\s*[-–—xX]\s*([0-5])\b/g, ''); // Remove o placar da string dos times
            
            // Remove números de placar embutidos tipo "2 0" soltos na string
            limpo = limpo.replace(/\b[0-5]\s+[0-5]\b/g, '');

            // Separa os times de forma limpa
            let pedacos = limpo.split(/[-–—]|vs/i).map(p => p.replace(/[\d%]/g, '').trim()).filter(p => p.length > 2);

            let confrontoFinal = "";
            if (pedacos.length >= 2) {
                confrontoFinal = `${pedacos[0]} x ${pedacos[1]}`;
            } else {
                confrontoFinal = limpo.replace(/\s+/g, ' ').trim();
                confrontoFinal = confrontoFinal.replace(/^[x\s-]+|[x\s-]+$/g, '');
            }

            if (!confrontoFinal || confrontoFinal.length < 5 || confrontoFinal.includes('x x')) continue;

            // Montagem final do card padronizado para o Telegram
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

varrerEEnviarCirurgico();
setInterval(varrerEEnviarCirurgico, 180000);
