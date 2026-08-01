const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Leve & Funcional ⚽🚩</h2>'));
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

async function varrerLeve() {
    let browser = null;
    try {
        console.log("⚡ [Scanner Leve] Iniciando varredura...");

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
            timeout: 60000
        });

        // Aguarda os dados carregarem na tela
        await new Promise(r => setTimeout(r, 6000));

        const partidas = await page.evaluate(() => {
            let dados = [];
            // Procura todos os blocos de texto que contêm o tempo do jogo (ex: 15', 30')
            let elementos = document.querySelectorAll('*');
            
            elementos.forEach(el => {
                let txt = el.innerText ? el.innerText.trim() : '';
                // Se encontrar um elemento com o tempo de jogo e o texto tiver tamanho suficiente para ser um card
                if (/^\d{1,3}'$/.test(txt) && el.innerText.length > 30 && el.innerText.length < 400) {
                    let linhas = el.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    if (linhas.length >= 4) {
                        let tempo = txt;
                        // Tenta extrair informações limpas do bloco
                        dados.push({
                            bloco: linhas.join(' | ')
                        });
                    }
                }
            });
            
            return dados;
        });

        console.log(`📊 Blocos capturados: ${partidas.length}`);
        if (partidas.length > 0) {
            console.log("Exemplo de bloco:", partidas[0].bloco);
        }

    } catch (erro) {
        console.error("❌ Erro na varredura leve:", erro.message);
    } finally {
        if (browser) await browser.close();
    }
}

varrerLeve();
setInterval(varrerLeve, 120000);
