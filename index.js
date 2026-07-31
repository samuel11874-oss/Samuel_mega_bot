const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Extração Estruturada ⚽</h2>'));
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

async function varrerEEnviarEstruturado() {
    let browser = null;
    try {
        console.log("⚡ [Radar Estruturado] Conectando ao SokkerPRO...");

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

        // Extração estruturada direto dos elementos do DOM do SokkerPRO
        const partidasExtraidas = await page.evaluate(() => {
            const listaJogos = [];
            
            // Procura por blocos que representam linhas de partidas ou cartões no site móvel
            const elementos = document.querySelectorAll('div');
            
            elementos.forEach(el => {
                const texto = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';
                
                // Filtra apenas blocos que contêm indicadores de tempo ao vivo e confronto
                if (
                    texto.length > 20 && 
                    texto.length < 250 && 
                    (/\d{1,3}'/.test(texto) || texto.includes('HT') || texto.includes('FT')) &&
                    (texto.includes('-') || texto.includes('x'))
                ) {
                    listaJogos.push(texto);
                }
            });

            return [...new Set(listaJogos)];
        });

        console.log(`📊 Partidas estruturadas encontradas: ${partidasExtraidas.length}`);
        let enviadosNoCiclo = 0;

        for (let blocoTexto of partidasExtraidas) {
            let chaveUnica = blocoTexto.substring(0, 30);
            if (jogosEnviadosCache.has(chaveUnica)) continue;
            jogosEnviadosCache.add(chaveUnica);

            // 1. Extração do Tempo
            let matchTempo = blocoTexto.match(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/i);
            let tempoJogo = matchTempo ? traduzirTempo(matchTempo[0]) : "Ao Vivo";

            // 2. Extração limpa da Liga (procura padrões conhecidos ou pega o topo do bloco)
            let linhas = blocoTexto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let liga = "Futebol Ao Vivo";
            
            for (let linha of linhas) {
                if (
                    linha.length > 3 && 
                    !/\d{1,3}'/.test(linha) && 
                    !/\d+\s*x\s*\d+/.test(linha) && 
                    !/^\d+$/.test(linha) &&
                    !/%/.test(linha)
                ) {
                    liga = linha;
                    break;
                }
            }

            // Limpa sujeiras comuns que venham a colar no nome da liga
            liga = liga.replace(/(\d{1,3}'(?:\s*\+\s*\d+)?|HT|FT)/gi, '').trim();
            if (!liga || liga.length < 3) liga = "Futebol Ao Vivo";

            // 3. Extração real do Placar (Procura por dígitos isolados de placar tipo "1 - 0", "2 x 1" ou placares grudados)
            let matchPlacar = blocoTexto.match(/\b([0-9])\s*[-–—xX]\s*([0-9])\b/);
            let placarJogo = matchPlacar ? `${matchPlacar[1]} x ${matchPlacar[2]}` : null;

            // Se não achou no formato padrão, tenta varrer números isolados sequenciais no texto
            if (!placarJogo) {
                let numerosIsolados = blocoTexto.match(/\b\d\b/g);
                if (numerosIsolados && numerosIsolados.length >= 2) {
                    // Geralmente os primeiros números após o tempo/odds são os gols
                    placarJogo = `${numerosIsolados[0]} x ${numerosIsolados[1]}`;
                } else {
                    placarJogo = "0 x 0";
                }
            }

            // 4. Limpeza rigorosa dos Times (Remove a liga, o tempo, odds em %, o placar e caracteres residuais)
            let limpo = blocoTexto;
            limpo = limpo.replace(liga, '');
            if (matchTempo) limpo = limpo.replace(matchTempo[0], '');
            limpo = limpo.replace(/\d+%/g, ''); // Remove percentuais de estatística
            limpo = limpo.replace(/\b([0-9])\s*[-–—xX]\s*([0-9])\b/g, ''); // Remove o placar da string dos times
            
            // Remove números soltos de odds ou pontuações residuais
            let pedacos = limpo.split(/[-–—]|vs/i).map(p => p.replace(/[\d%]/g, '').trim()).filter(p => p.length > 2);

            let confrontoFinal = "";
            if (pedacos.length >= 2) {
                confrontoFinal = `${pedacos[0]} x ${pedacos[1]}`;
            } else {
                // Fallback de limpeza caso o split falhe
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

        console.log(`✅ Ciclo concluído. ${enviadosNoCiclo} cards estruturados enviados.`);

    } catch (erro) {
        console.error("❌ Erro na varredura:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

varrerEEnviarEstruturado();
setInterval(varrerEEnviarEstruturado, 180000);
