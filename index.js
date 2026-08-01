const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Scanner Ativo ⚽🚩</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const memoriaPlacarJogos = new Map();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    return t.trim();
}

async function varrerComEspera() {
    let browser = null;
    try {
        console.log("⚡ [Scanner] Conectando e aguardando carregamento...");

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

        // Aguarda 12 segundos para o site injetar os jogos na tela
        console.log("⏳ Aguardando renderização dos jogos (12s)...");
        await new Promise(r => setTimeout(r, 12000));

        const partidas = await page.evaluate(() => {
            let dados = [];
            let elementos = document.querySelectorAll('*');
            
            elementos.forEach(el => {
                let txt = el.innerText ? el.innerText.trim() : '';
                // Procura elementos que contêm o tempo de minutos (ex: 25')
                if (/^\d{1,3}'$/.test(txt) && el.innerText.length > 30 && el.innerText.length < 500) {
                    let linhas = el.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    if (linhas.length >= 3) {
                        dados.push({ bloco: linhas.join(' | ') });
                    }
                }
            });
            
            return dados;
        });

        console.log(`📊 Blocos capturados com sucesso: ${partidas.length}`);
        if (partidas.length > 0) {
            console.log("Primeiro bloco encontrado:", partidas[0].bloco);
        }

    } catch (erro) {
        console.error("❌ Erro na varredura:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

varrerComEspera();
setInterval(varrerComEspera, 120000);
