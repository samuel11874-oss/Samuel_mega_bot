const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Escanteios Ao Vivo ⚽🚩</h2>'));
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
    console.log("🕒 [BOT] Iniciando varredura com captura otimizada de escanteios...");
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
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ Aguardando 10s para carregamento...");
        await new Promise(r => setTimeout(r, 10000));

        for (let i = 0; i < 4; i++) {
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise(r => setTimeout(r, 1000));
        }

        const partidas = await page.evaluate(() => {
            let lista = [];
            let textoCorpo = document.body ? document.body.innerText : '';
            let linhasTotal = textoCorpo.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            for (let i = 0; i < linhasTotal.length; i++) {
                let linha = linhasTotal[i];
                // Procura o minuto do jogo (ex: 15', 30')
                if (/^\d{1,3}'$/.test(linha) || linha === 'HT') {
                    let inicio = Math.max(0, i - 2);
                    let fim = Math.min(linhasTotal.length, i + 12);
                    let bloco = linhasTotal.slice(inicio, fim);
                    lista.push(bloco);
                }
            }
            return lista;
        });

        console.log(`📊 Blocos de partidas encontrados: ${partidas.length}`);
        let enviados = 0;

        for (let linhas of partidas) {
            let tempo = linhas.find(l => /^\d{1,3}'$/.test(l) || l === 'HT') || "Ao Vivo";
            
            // Ignora termos indesejados
            let ignorar = ['mexico', 'united states', 'chile', 'colombia', 'ecuador', 'brazil', 'honduras', 'liga', 'division', 'mls', 'nwsl', 'amazonense', 'tercera', 'expansión', 'nacional', 'betplay', 'libertad', 'finished', 'replays', 'placar', '1 x 2', 'all', 'live', 'upcoming'];

            let possiveisTimes = linhas.filter(l => {
                let lLower = l.toLowerCase();
                return l.length > 2 && 
                    !l.includes('%') && 
                    !l.includes('.') && 
                    !/^\d+$/.test(l) && 
                    !/^\d{1,3}'$/.test(l) &&
                    !ignorar.some(ig => lLower.includes(ig));
            });

            if (possiveisTimes.length >= 2) {
                let timeCasa = possiveisTimes[0];
                let timeFora = possiveisTimes[1];
                let confronto = `${timeCasa} x ${timeFora}`;

                // Extração inteligente de números (procurando padrões de placar e escanteios)
                let numeros = linhas.filter(l => /^\d+$/.test(l));
                
                // No SokkerPRO, os primeiros números costumam ser os gols e os seguintes os escanteios
                let golsCasa = numeros.length > 0 ? numeros[0] : "0";
                let golsFora = numeros.length > 1 ? numeros[1] : "0";
                let escCasa = numeros.length > 4 ? numeros[4] : (numeros.length > 2 ? numeros[2] : "0");
                let escFora = numeros.length > 5 ? numeros[5] : (numeros.length > 3 ? numeros[3] : "0");

                let placar = `${golsCasa} x ${golsFora}`;
                let escanteios = `${escCasa} x ${escFora}`;

                let chave = confronto.toLowerCase().replace(/\s+/g, '');
                if (memoriaJogos.get(chave) === placar && memoriaJogos.get(chave + '_esc') === escanteios) {
                    continue; 
                }
                memoriaJogos.set(chave, placar);
                memoriaJogos.set(chave + '_esc', escanteios);

                let card = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
                card += `⏱ <b>Tempo:</b> ${traduzirTempo(tempo)}\n`;
                card += `⚔️ <b>Confronto:</b> <code>${confronto}</code>\n`;
                card += `⚽ <b>Placar:</b> <b>${placar}</b>\n`;
                card += `🚩 <b>Escanteios:</b> <b>${escanteios}</b>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                enviados++;
                console.log(`📤 Alerta com Escanteios: ${confronto} (${placar}) - Escanteios: ${escanteios}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        console.log(`✅ Ciclo finalizado. ${enviados} alertas enviados ao Telegram.`);

    } catch (erro) {
        console.error(`❌ Erro crítico: ${erro.message}`);
    } finally {
        if (browser) await browser.close();
        console.log("========================================\n");
    }
}

varrerPartidasAoVivo();
setInterval(varrerPartidasAoVivo, 120000);
