const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Ligas & Gols ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Memória para rastrear o último placar enviado de cada jogo (evita duplicidade, permitindo reenvio apenas em caso de gol)
const memoriaPlacarJogos = new Map();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    t = t.replace('MIN', 'min').replace('+', ' + ');
    return t.trim();
}

async function varrerEEnviarLigasEGols() {
    let browser = null;
    try {
        console.log("⚡ [Radar Ligas & Gols] Conectando ao SokkerPRO...");

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

        // Extração estruturada capturando o contexto da liga e da partida no DOM do SokkerPRO
        const dadosExtraidos = await page.evaluate(() => {
            const listaPartidas = [];
            
            // O site agrupa seções por campeonatos/ligas. Vamos varrer os blocos principais.
            const containers = document.querySelectorAll('div');

            containers.forEach(container => {
                const texto = container.innerText ? container.innerText.replace(/\s+/g, ' ').trim() : '';

                if (
                    texto.length > 20 &&
                    texto.length < 350 &&
                    (/\d{1,3}'/.test(texto) || texto.includes('HT') || texto.includes('FT')) &&
                    (texto.includes('x') || texto.includes('-')) &&
                    !texto.includes('ODDSLIVE') &&
                    !texto.includes('Subscribe') &&
                    !texto.includes('RESPONSIBILITY')
                ) {
                    // Tenta achar um título de liga nas proximidades superiores ou dentro do bloco
                    let ligaDetectada = "Futebol Ao Vivo";
                    let linhas = texto.split('\n');
                    
                    for (let linha of linhas) {
                        let lUp = linha.toUpperCase();
                        if (
                            (lUp.includes('GERMANY') || lUp.includes('AUSTRIA') || lUp.includes('MEXICO') || 
                             lUp.includes('IRELAND') || lUp.includes('BRAZIL') || lUp.includes('UNITED STATES') ||
                             lUp.includes('MLS') || lUp.includes('LEAGUE') || lUp.includes('OBERLIGA') || 
                             lUp.includes('REGIONALLIGA') || lUp.includes('PREMIERSHIP') || lUp.includes('CHAMPIONSHIP') || 
                             lUp.includes('CUP') || lUp.includes('JUNIROEN') || lUp.includes('WOMEN') || lUp.includes('PRO')) &&
                            !lUp.includes("'") && !lUp.includes("X") && lUp.length < 45
                        ) {
                            ligaDetectada = linha.trim();
                            break;
                        }
                    }

                    listaPartidas.push({
                        bloco: texto,
                        ligaContexto: ligaDetectada
                    });
                }
            });

            return listaPartidas;
        });

        console.log(`📊 Partidas brutas capturadas: ${dadosExtraidos.length}`);
        let enviadosNoCiclo = 0;

        for (let item of dadosExtraidos) {
            let bloco = item.bloco;
            let liga = item.ligaContexto;

            // 1. Extração do Tempo de Jogo
            let matchTempo = bloco.match(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/i);
            let tempoJogo = matchTempo ? traduzirTempo(matchTempo[0]) : "Ao Vivo";

            // 2. Extração do Placar Real
            let placarJogo = "0 x 0";
            let matchPlacar = bloco.match(/\b([0-5])\s*[-–—xX]\s*([0-5])\b/);
            if (matchPlacar) {
                placarJogo = `${matchPlacar[1]} x ${matchPlacar[2]}`;
            }

            // 3. Limpeza rigorosa do Confronto (Remove liga, tempo, placar e odds residuais)
            let limpo = bloco;
            if (liga !== "Futebol Ao Vivo") limpo = limpo.replace(liga, '');
            if (matchTempo) limpo = limpo.replace(matchTempo[0], '');
            
            limpo = limpo.replace(/\d+%/g, '');
            limpo = limpo.replace(/\b([0-5])\s*[-–—xX]\s*([0-5])\b/g, '');
            limpo = limpo.replace(/\b\d+\.\d{2}\b/g, ''); // Remove odds decimais soltas (ex: 8.50, 1.10)

            let pedacos = limpo.split(/[-–—]|vs/i).map(p => p.replace(/[\d%]/g, '').trim()).filter(p => p.length > 2);

            let confrontoFinal = "";
            if (pedacos.length >= 2) {
                confrontoFinal = `${pedacos[0]} x ${pedacos[1]}`;
            } else {
                confrontoFinal = limpo.replace(/\s+/g, ' ').trim();
                confrontoFinal = confrontoFinal.replace(/^[x\s-]+|[x\s-]+$/g, '');
            }

            if (!confrontoFinal || confrontoFinal.length < 5 || confrontoFinal.includes('x x')) continue;

            // Identificador único do jogo baseado nos times principais
            let chaveJogo = confrontoFinal.toLowerCase().replace(/\s+/g, '');

            // 4. Regra Anti-Duplicidade / Controle de Gols
            // Se o jogo já foi enviado e o placar é o MESMO, o bot ignora (evita duplicidade).
            // Se o placar mudou (saiu gol), ele permite o envio do novo card anunciando o gol!
            if (memoriaPlacarJogos.has(chaveJogo)) {
                let placarAnterior = memoriaPlacarJogos.get(chaveJogo);
                if (placarAnterior === placarJogo) {
                    continue; // Jogo já reportado com este placar, não faz nada.
                } else {
                    console.log(`⚽ GOL DETECTADO em ${confrontoFinal}! Placar anterior: ${placarAnterior} -> Novo Placar: ${placarJogo}`);
                }
            }

            // Atualiza a memória com o placar atual
            memoriaPlacarJogos.set(chaveJogo, placarJogo);

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

        console.log(`✅ Ciclo concluído. ${enviadosNoCiclo} cards enviados (com filtro de liga e controle de gols).`);

    } catch (erro) {
        console.error("❌ Erro na varredura:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

varrerEEnviarLigasEGols();
setInterval(varrerEEnviarLigasEGols, 180000);
