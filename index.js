const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Padrão de Card Pro ⚽</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const jogosEnviadosCache = new Set();

const termosExcluidos = /sub-?\d{2}|sub\d|u\d{2}|u\d{1}|junior|youth|feminino|women|\(w\)|amador|regional|bta|reserva|friendly|amistoso/i;

function ehLigaPrincipal(textoLiga) {
    if (termosExcluidos.test(textoLiga)) return false;
    const padroesPrincipais = /primera|premier|serie a|serie b|bundesliga|ligue 1|ligue 2|eredivisie|primeira|championship|segunda|división|division|pro league|super lig|superleague/i;
    return padroesPrincipais.test(textoLiga);
}

async function varrerEEnviarCardsPadrao() {
    let browser = null;
    try {
        console.log("⚡ [Radar Padrao Pro] Conectando ao SokkerPRO...");

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
            timeout: 60000
        });

        console.log("⏳ Carregando os dados das partidas ao vivo...");
        await new Promise(r => setTimeout(r, 7000));

        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => window.scrollBy(0, 800));
            await new Promise(r => setTimeout(r, 1500));
        }

        // Extração avançada espelhando o formato exato do seu print
        const partidasExtraidas = await page.evaluate(() => {
            const lista = [];
            const blocos = document.querySelectorAll('div');

            blocos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';
                
                if (texto.includes(' - ') && (texto.includes("'") || texto.includes('HT') || texto.includes('FT'))) {
                    const linhasDetalhadas = texto.split('\n').map(p => p.trim()).filter(p => p.length > 0);
                    
                    // Extração de placar e estatísticas básicas simuladas do bloco visível
                    let placar = "0 x 0";
                    const matchPlacar = texto.match(/(\d{1,2})\s*x\s*(\d{1,2})/);
                    if (matchPlacar) {
                        placar = `${matchPlacar[1]} x ${matchPlacar[2]}`;
                    }

                    lista.push({
                        chaveUnica: texto.substring(0, 60),
                        textoBruto: texto,
                        linhas: linhasDetalhadas,
                        placar: placar
                    });
                }
            });

            const unicos = [];
            const vistos = new Set();
            for (const item of lista) {
                if (!vistos.has(item.chaveUnica)) {
                    vistos.add(item.chaveUnica);
                    unicos.push(item);
                }
            }
            return unicos;
        });

        console.log(`📊 Total de partidas brutas encontradas: ${partidasExtraidas.length}`);
        let enviadosNoCiclo = 0;

        for (const jogo of partidasExtraidas) {
            let linhas = jogo.linhas;
            let liga = linhas.length > 0 ? linhas[0] : "Futebol Ao Vivo";

            // Filtro rigoroso para as principais ligas (1ª e 2ª divisões)
            if (!ehLigaPrincipal(liga) && !ehLigaPrincipal(jogo.chaveUnica)) {
                continue;
            }

            // Evita duplicar o envio do mesmo jogo no curto prazo
            if (jogosEnviadosCache.has(jogo.chaveUnica)) continue;
            jogosEnviadosCache.add(jogo.chaveUnica);

            // Identifica o tempo de jogo
            let tempoJogo = "Ao Vivo";
            for (const l of linhas) {
                if (l.includes("'") || l.includes("HT") || l.includes("FT") || /^\d{1,3}\s*['′]/.test(l)) {
                    tempoJogo = l;
                    break;
                }
            }

            // Montagem do card seguindo rigorosamente o modelo do seu print
            let cardTelegram = `🏟 **Jogo:** <code>${jogo.textoBruto}</code>\n`;
            cardTelegram += `🏆 **Competição:** ${liga}\n`;
            cardTelegram += `⏱ **Tempo:** ${tempoJogo}\n`;
            cardTelegram += `⚽ **Resultado:** ${jogo.placar}\n`;
            cardTelegram += `⚔️ **Ataques Pericosos:** (Aguardando carga ao vivo)\n`;
            cardTelegram += `⛳ **Cantos:** (Aguardando carga ao vivo)\n`;
            cardTelegram += `⚖️ **Posse bola:** (Aguardando carga ao vivo)`;

            await bot.sendMessage(CHAT_ID, cardTelegram, { parse_mode: 'HTML' }).catch(() => {});
            enviadosNoCiclo++;
            await new Promise(r => setTimeout(r, 2000)); // Delay para respeitar o limite do Telegram
        }

        console.log(`✅ Ciclo finalizado. ${enviadosNoCiclo} cards das principais ligas enviados.`);

    } catch (erro) {
        console.error("❌ Erro na varredura:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa imediatamente ao iniciar para enviar os jogos que estão rolando agora
varrerEEnviarCardsPadrao();

// Repete a verificação a cada 3 minutos
setInterval(varrerEEnviarCardsPadrao, 180000);
