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

        // Acessa a página de jogos ao vivo
        console.log("🌐 [Bot Live] Navegando para a seção Ao Vivo do Soccerway...");
        await page.goto('https://br.soccerway.com/livescores/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Espera 4 segundos para os elementos dinâmicos carregarem na tela
        await new Promise(r => setTimeout(r, 4000));

        // Extrai as partidas diretamente do DOM dinâmico
        const jogos = await page.evaluate(() => {
            const lista = [];
            // Seletores comuns da tabela de jogos do Soccerway
            const linhas = document.querySelectorAll('table.matches tr.match, div.match-card, .match');

            linhas.forEach(linha => {
                const tempo = linha.querySelector('.minute, .status, .time')?.innerText?.trim() || '';
                const timeCasa = linha.querySelector('.team-a, .home-team, .team-home')?.innerText?.trim() || '';
                const timeFora = linha.querySelector('.team-b, .away-team, .team-away')?.innerText?.trim() || '';
                const placar = linha.querySelector('.score, .result')?.innerText?.trim() || 'x';

                if (timeCasa && timeFora) {
                    lista.push({
                        tempo,
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
            bot.sendMessage(CHAT_ID, "ℹ️ *Nenhuma partida ao vivo encontrada no momento.*", { parse_mode: 'Markdown' }).catch(()=>{});
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
