const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Modo Investigação 🕵️‍♂️</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function executarRaioX() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ Iniciando a Super Investigação...");
        await bot.sendMessage(CHAT_ID, "🕵️‍♂️ <b>Iniciando a Super Investigação...</b>\nVou capturar a estrutura de 3 jogos e enviar o log bruto para descobrirmos a posição exata dos escanteios.", { parse_mode: 'HTML' });

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
            timeout: 90000
        });

        console.log("⏳ Aguardando renderização (10s)...");
        await new Promise(r => setTimeout(r, 10000));

        const relatorioBruto = await page.evaluate(() => {
            // Captura absolutamente todo o texto da página, separando por quebras de linha reais
            let linhas = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            let log = [];
            let contadorJogos = 0;
            let gravando = false;

            for (let i = 0; i < linhas.length; i++) {
                let txt = linhas[i];
                
                // O gatilho para identificar que um jogo começou é o relógio (ex: 15', HT, FT)
                if (/^(\d{1,3}'|HT|FT|Intervalo)$/i.test(txt)) {
                    contadorJogos++;
                    if (contadorJogos > 3) break; // Pega apenas os 3 primeiros jogos para não poluir o Telegram
                    
                    log.push(`\n=== JOGO ${contadorJogos} ===`);
                    if (i > 0) log.push(`[LINHA ANTERIOR]: ${linhas[i-1]}`);
                    gravando = true;
                }
                
                if (gravando) {
                    log.push(`[LINHA]: ${txt}`);
                }
            }
            return log.join('\n');
        });

        console.log("Raio-X Concluído:\n", relatorioBruto);
        
        // Envia o texto como bloco de código (pre) para o Telegram não desformatar
        let mensagem = `🛠 <b>RAIO-X SOKKERPRO</b> 🛠\n\n<pre>${relatorioBruto.substring(0, 3500)}</pre>`;
        await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' });
        await bot.sendMessage(CHAT_ID, "👆 Copie esse texto do Raio-X e me envie aqui na conversa. Com base nisso, vou criar o filtro definitivo pros escanteios!");

    } catch (erro) {
        console.error("❌ Erro no Raio-X:", erro.message);
        await bot.sendMessage(CHAT_ID, `Erro no Raio-X: ${erro.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

executarRaioX();
