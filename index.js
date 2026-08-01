const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Definitivo Ao Vivo ⚽🚩</h2>'));
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
    console.log("🕒 [BOT] Iniciando ciclo de varredura ao vivo...");
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

        console.log("⏳ Aguardando 8s para renderização dos dados...");
        await new Promise(r => setTimeout(r, 8000));

        // Rolagem para garantir carregamento completo
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, 600));
            await new Promise(r => setTimeout(r, 1000));
        }

        const partidas = await page.evaluate(() => {
            let lista = [];
            // Procura todos os blocos que contenham o indicador de minutos (ex: ' )
            let elementos = document.querySelectorAll('*');
            
            elementos.forEach(el => {
                let txt = el.innerText ? el.innerText.trim() : '';
                // Identifica blocos de jogos ao vivo que possuem o tempo (ex: 15', 45') e tamanho adequado
                if (/^\d{1,3}'$/.test(txt) && el.innerText.length > 20 && el.innerText.length < 600) {
                    let linhas = el.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    if (linhas.length >= 3) {
                        lista.push(linhas);
                    }
                }
            });
            return lista;
        });

        console.log(`📊 Partidas brutas capturadas: ${partidas.length}`);
        let enviados = 0;

        for (let linhas of partidas) {
            let tempo = linhas.find(l => /^\d{1,3}'$/.test(l) || l.includes('HT') || l.includes('FT')) || "Ao Vivo";
            
            let possiveisTimes = linhas.filter(l => 
                l.length > 2 && 
                !l.includes('%') && 
                !l.includes('.') && 
                !/^\d+$/.test(l) && 
                !/^\d{1,3}'$/.test(l) &&
                !l.toLowerCase().includes('mexico') &&
                !l.toLowerCase().includes('liga') &&
                l !== 'HT' && l !== 'FT'
            );

            if (possiveisTimes.length >= 2) {
                let timeCasa = possiveisTimes[0];
                let timeFora = possiveisTimes[1];
                let confronto = `${timeCasa} x ${timeFora}`;

                let numeros = linhas.filter(l => /^\d+$/.test(l));
                let golsCasa = numeros.length > 0 ? numeros[0] : "0";
                let golsFora = numeros.length > 1 ? numeros[1] : "0";
                let escCasa = numeros.length > 2 ? numeros[2] : "0";
                let escFora = numeros.length > 3 ? numeros[3] : "0";

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
                console.log(`📤 Alerta enviado: ${confronto} (${placar})`);
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
