const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Scanner Direto ⚽🚩</h2>'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`));

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const memoriaJogos = new Map();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    return t.trim();
}

async function varrerPartidasAoVivo() {
    console.log("\n========================================");
    console.log("🕒 [BOT] Iniciando varredura na home do SokkerPRO...");
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

        await page.goto('https://m.sokkerpro.com/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização dos cards...");
        await new Promise(r => setTimeout(r, 10000));

        // Rola a página para baixo para disparar lazy-loads se houverem
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 600));
            await new Promise(r => setTimeout(r, 1500));
        }

        // Extrai o texto visível de todos os elementos estruturados da página
        const dadosPartidas = await page.evaluate(() => {
            let blocos = document.querySelectorAll('article, section, [class*="match"], [class*="game"], div');
            let resultados = [];

            blocos.forEach(el => {
                let texto = el.innerText ? el.innerText.trim() : '';
                // Procura blocos que tenham o formato de tempo ao vivo (ex: 35', 76', etc)
                if (/\d{1,3}'/.test(texto) && texto.split('\n').length >= 4 && texto.length < 400) {
                    let linhas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    if (!resultados.some(r => r.join('|') === linhas.join('|'))) {
                        resultados.push(linhas);
                    }
                }
            });

            return resultados;
        });

        console.log(`📊 Partidas capturadas: ${dadosPartidas.length}`);
        let enviados = 0;

        for (let linhas of dadosPartidas) {
            let linhaTempo = linhas.find(l => /\d{1,3}'/.test(l));
            if (!linhaTempo) continue;

            let indexTempo = linhas.indexOf(linhaTempo);
            
            // Tenta pegar a liga nas linhas acima do tempo
            let liga = indexTempo >= 2 ? linhas[indexTempo - 2] : (indexTempo >= 1 ? linhas[indexTempo - 1] : "Futebol Ao Vivo");
            if (liga.length < 3 || /^\d+$/.test(liga) || liga.includes('%')) {
                liga = "Futebol Ao Vivo";
            }

            // Filtra os times
            let times = linhas.filter(l => 
                l.length > 2 && 
                !l.includes('%') && 
                !l.includes('.') && 
                !/^\d+$/.test(l) && 
                !/\d{1,3}'/.test(l) &&
                !l.toLowerCase().includes('live') &&
                !l.toLowerCase().includes('todos') &&
                !l.toLowerCase().includes('próximos') &&
                !l.toLowerCase().includes('fim')
            );

            if (times.length < 2) continue;

            let timeCasa = times[0];
            let timeFora = times[1];
            let confronto = `${timeCasa} x ${timeFora}`;

            // Extração de placar
            let numeros = linhas.filter(l => /^\d+$/.test(l));
            let golsCasa = numeros.length > 0 ? numeros[0] : "0";
            let golsFora = numeros.length > 1 ? numeros[1] : "0";

            let placar = `${golsCasa} x ${golsFora}`;

            let chave = confronto.toLowerCase().replace(/\s+/g, '');
            if (memoriaJogos.get(chave) === placar) {
                continue; 
            }
            memoriaJogos.set(chave, placar);

            let card = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            card += `🏆 <b>Liga:</b> ${liga}\n`;
            card += `⏱ <b>Tempo:</b> ${traduzirTempo(linhaTempo)}\n`;
            card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
            card += `⚽ <b>Placar:</b> <b>${placar}</b>`;

            await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
            enviados++;
            console.log(`📤 Alerta Enviado | ${liga} | ${confronto} (${placar})`);
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`✅ Ciclo finalizado. ${enviados} alertas enviados.`);

    } catch (erro) {
        console.error(`❌ Erro crítico: ${erro.message}`);
    } finally {
        if (browser) await browser.close();
        console.log("========================================\n");
    }
}

varrerPartidasAoVivo();
setInterval(varrerPartidasAoVivo, 120000);
