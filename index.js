const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Top Ligas V21 🏆</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Lista completa das melhores ligas do Brasil, América do Sul e Europa
const TOP_LIGAS = [
    // Brasil
    'brasil', 'brazil', 'brasileiro', 'serie a', 'serie b', 'copa do brasil', 'paulista', 'carioca',
    // América do Sul
    'libertadores', 'sudamericana', 'sul-americana', 'argentina', 'colombia', 'chile', 'uruguay', 'paraguay',
    // Europa & Campeonatos Principais
    'champions', 'europa league', 'conference league', 'premier league', 'england', 'la liga', 'spain',
    'serie a italy', 'italy', 'bundesliga', 'germany', 'ligue 1', 'france', 'portugal', 'eredivisie', 'netherlands'
];

async function executarTopLigasV21() {
    let browser = null;
    try {
        console.log("🏆 [Bot V21 - Top Ligas] Mapeando 100% das partidas das principais ligas...");

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1366,768'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

        console.log("🌐 Acessando a lista completa de hoje no TotalCorner...");
        const response = await page.goto('https://www.totalcorner.com/match/today', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log(`📡 Status HTTP: ${response ? response.status() : 0}`);
        await new Promise(r => setTimeout(r, 5000));

        const jogosFiltrados = await page.evaluate((ligasEspecial) => {
            const lista = [];
            const trs = document.querySelectorAll('tr');

            trs.forEach(tr => {
                const texto = tr.innerText || '';

                // Procura horário formatado (ex: 16:00, 21:30)
                const horaMatch = texto.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
                if (!horaMatch) return;

                const horaJogo = horaMatch[0];

                // Extrai times dos links da linha
                const links = tr.querySelectorAll('a');
                let times = [];
                links.forEach(a => {
                    const txt = a.innerText.trim();
                    if (txt.length > 2 && !/^(stats|odds|vip|analysis|live|today|app)$/i.test(txt)) {
                        times.push(txt);
                    }
                });

                if (times.length >= 2) {
                    const timeA = times[0];
                    const timeB = times[1];

                    // Tenta identificar o nome da liga
                    let ligaNome = "Campeonato Geral";
                    const prevRow = tr.previousElementSibling;
                    if (prevRow && (prevRow.classList.contains('league') || prevRow.innerText.length < 60)) {
                        ligaNome = prevRow.innerText.trim();
                    }

                    const contextoCompleto = (texto + ' ' + ligaNome).toLowerCase();

                    // Verifica se pertence a uma Top Liga
                    const eTopLiga = ligasEspecial.some(liga => contextoCompleto.includes(liga));

                    if (eTopLiga) {
                        lista.push({
                            hora: horaJogo,
                            timeA: timeA,
                            timeB: timeB,
                            liga: ligaNome
                        });
                    }
                }
            });

            // Remove duplicatas
            const unicos = [];
            const vistos = new Set();
            lista.forEach(item => {
                const chave = `${item.timeA} x ${item.timeB}`;
                if (!vistos.has(chave)) {
                    vistos.add(chave);
                    unicos.push(item);
                }
            });

            return unicos;
        }, TOP_LIGAS);

        console.log(`⚽ [Bot V21] Total de partidas de TOP LIGAS encontradas para hoje: ${jogosFiltrados.length}`);

        if (jogosFiltrados.length > 0) {
            // Avisa no Telegram quantas partidas das principais ligas foram encontradas
            let resumo = `🚨 <b>[ RADAR DE HOJE - TOP LIGAS ]</b> 🏆\n`;
            resumo += `━━━━━━━━━━━━━━━━━━━━━━\n`;
            resumo += `📊 <b>Total de Jogos de Elite Hoje:</b> <code>${jogosFiltrados.length}</code>\n`;
            resumo += `🌎 <i>América do Sul, Brasil & Europa</i>\n`;
            resumo += `━━━━━━━━━━━━━━━━━━━━━━\n`;
            resumo += `👇 <i>Enviando lista completa abaixo...</i>`;

            await bot.sendMessage(CHAT_ID, resumo, { parse_mode: 'HTML' }).catch(() => {});
            await new Promise(r => setTimeout(r, 1000));

            let enviados = 0;

            // ENVIA TODOS OS JOGOS SEM CORTAR EM 15
            for (let i = 0; i < jogosFiltrados.length; i++) {
                const j = jogosFiltrados[i];
                enviados++;

                let card = `🛸 <b>[ AGENDA TOP LIGAS ]</b> (#${enviados})\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `⏰ <b>HORÁRIO:</b> <code> ${j.hora} </code>\n\n`;
                card += `⚔️ <b>CONFRONTO:</b>\n`;
                card += `  🔹 <b>${j.timeA}</b>\n`;
                card += `  🔸 <b>${j.timeB}</b>\n\n`;
                if (j.liga && j.liga !== "Campeonato Geral") {
                    card += `🏆 <b>Liga/Torneio:</b> <i>${j.liga}</i>\n`;
                }
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Samuel Mega Bot • Precisão V21</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                // Pausa de 700ms para respeitar a velocidade do Telegram
                await new Promise(r => setTimeout(r, 700));
            }

            console.log(`✅ Todos os ${enviados} cards das principais ligas foram entregues no Telegram!`);
        } else {
            console.log("⚠️ Nenhuma partida das Top Ligas foi identificada para o dia de hoje.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V21:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 30 minutos
setInterval(executarTopLigasV21, 1800000);
executarTopLigasV21();
