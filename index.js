const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Monitor de Jogos Ao Vivo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const USER_AGENTS = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.118 Mobile Safari/537.36'
];

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot Live] Iniciando busca por partidas ao vivo...");
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        await page.setUserAgent(userAgent);
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

        console.log("🌐 [Bot Live] Navegando para a seção Ao Vivo do Soccerway...");
        await page.goto('https://br.soccerway.com/livescores/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Aguarda a tabela de partidas carregar no DOM
        await page.waitForSelector('table.matches, .livescores', { timeout: 15000 }).catch(() => console.log("Aviso: Tempo limite do seletor atingido."));

        // Extração ajustada para a estrutura real de tabelas do Soccerway
        const jogos = await page.evaluate(() => {
            const lista = [];
            
            // Busca por todas as linhas de partida na tabela oficial
            const linhas = document.querySelectorAll('table.matches tr.match');

            linhas.forEach(linha => {
                const tempo = linha.querySelector('td.minute, td.status, td.score-time')?.innerText?.trim() || '';
                const timeCasa = linha.querySelector('td.team-a a, td.team-a')?.innerText?.trim() || '';
                const timeFora = linha.querySelector('td.team-b a, td.team-b')?.innerText?.trim() || '';
                const placar = linha.querySelector('td.score-time a, td.score')?.innerText?.trim() || 'x';

                if (timeCasa && timeFora) {
                    lista.push({
                        tempo: tempo.replace(/\n/g, ' '),
                        jogo: `${timeCasa} ${placar} ${timeFora}`
                    });
                }
            });

            return lista;
        });

        console.log(`⚽ [Bot Live] Total de jogos capturados: ${jogos.length}`);

        if (jogos.length > 0) {
            let mensagem = `🔴 *JOGOS AO VIVO AGORA (${jogos.length})*\n\n`;
            jogos.slice(0, 15).forEach(j => {
                mensagem += `⏱️ *${j.tempo || 'Em andamento'}*\n⚽ ${j.jogo}\n\n`;
            });

            bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'Markdown' }).catch(()=>{});
        } else {
            // Tenta extração alternativa caso o layout mobile seja renderizado em blocos div
            const blocosTexto = await page.evaluate(() => {
                const elementos = Array.from(document.querySelectorAll('.match, .match-card'));
                return elementos.map(e => e.innerText.trim()).filter(t => t.length > 0).slice(0, 10);
            });

            if (blocosTexto.length > 0) {
                let msg = `🔴 *JOGOS ENCONTRADOS (Layout Alternativo):*\n\n` + blocosTexto.join('\n---\n');
                bot.sendMessage(CHAT_ID, msg, { parse_mode: 'Markdown' }).catch(()=>{});
            } else {
                bot.sendMessage(CHAT_ID, "ℹ️ *Nenhuma partida ao vivo encontrada na varredura.*", { parse_mode: 'Markdown' }).catch(()=>{});
            }
        }

    } catch (error) {
        console.error("❌ Erro ao buscar jogos:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro na busca ao vivo:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

// Roda a verificação de jogos ao vivo a cada 10 minutos
setInterval(buscarJogosAoVivo, 600000);
buscarJogosAoVivo();
