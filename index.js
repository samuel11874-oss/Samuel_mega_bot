const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Agenda Pré-Jogo V20 📅</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

// Palavras-chave das ligas principais para destacar
const LIGAS_DE_DESTAQUE = [
    'brazil', 'brasil', 'libertadores', 'sudamericana', 'champions', 'premier',
    'la liga', 'serie a', 'bundesliga', 'ligue 1', 'england', 'spain', 'italy',
    'germany', 'france', 'argentina', 'cup', 'copa'
];

async function executarAgendaHojeV20() {
    let browser = null;
    try {
        console.log("📅 [Bot V20 - Pré-Jogo] Varrendo agenda de partidas para hoje...");

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

        console.log("🌐 Acessando jogos do dia no TotalCorner...");
        const response = await page.goto('https://www.totalcorner.com/match/today', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log(`📡 Status HTTP: ${response ? response.status() : 0}`);

        await new Promise(r => setTimeout(r, 5000));

        const jogosAgendados = await page.evaluate((ligasChave) => {
            const lista = [];
            const trs = document.querySelectorAll('tr');

            trs.forEach(tr => {
                const texto = tr.innerText || '';

                // Busca por padrão de hora (ex: 15:00, 19:30, 21:00)
                const horaMatch = texto.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
                if (!horaMatch) return;

                const horaJogo = horaMatch[0];

                // Busca os nomes dos times nos links da linha
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

                    // Tenta identificar a liga no contexto do elemento pai ou texto da linha
                    let ligaNome = "Campeonato Geral";
                    const prevRow = tr.previousElementSibling;
                    if (prevRow && (prevRow.classList.contains('league') || prevRow.innerText.length < 50)) {
                        ligaNome = prevRow.innerText.trim();
                    }

                    // Verifica se pertence a uma liga de destaque
                    const textoLower = (texto + ' ' + ligaNome).toLowerCase();
                    const eDestaque = ligasChave.some(liga => textoLower.includes(liga));

                    lista.push({
                        hora: horaJogo,
                        timeA: timeA,
                        timeB: timeB,
                        liga: ligaNome,
                        eDestaque: eDestaque
                    });
                }
            });

            // Remove duplicatas
            const unicos = [];
            const vistos = new Set();
            lista.forEach(item => {
                const chave = `${item.timeA} x ${item.timeB} - ${item.hora}`;
                if (!vistos.has(chave)) {
                    vistos.add(chave);
                    unicos.push(item);
                }
            });

            return unicos;
        }, LIGAS_DE_DESTAQUE);

        console.log(`⚽ [Bot V20] Total de partidas agendadas para hoje encontradas: ${jogosAgendados.length}`);

        if (jogosAgendados.length > 0) {
            // Prioriza os jogos das ligas de destaque no topo
            jogosAgendados.sort((a, b) => b.eDestaque - a.eDestaque);

            const limite = Math.min(jogosAgendados.length, 15);
            let enviados = 0;

            for (let i = 0; i < limite; i++) {
                const j = jogosAgendados[i];
                enviados++;

                const iconeLiga = j.eDestaque ? "🏆 <b>LIGA DE DESTAQUE</b>" : "⚽ <b>PRÉ-JOGO AGENDA</b>";

                let card = `🛸 <b>[ AGENDA DE JOGOS DE HOJE ]</b> 📅\n`;
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `${iconeLiga}\n`;
                card += `⏰ <b>HORÁRIO DE INÍCIO:</b> <code> ${j.hora} </code>\n\n`;
                card += `⚔️ <b>CONFRONTO:</b>\n`;
                card += `  🔹 <b>${j.timeA}</b>\n`;
                card += `  🔸 <b>${j.timeB}</b>\n\n`;
                if (j.liga && j.liga !== "Campeonato Geral") {
                    card += `🏆 <b>Torneio:</b> <i>${j.liga}</i>\n`;
                }
                card += `━━━━━━━━━━━━━━━━━━━━━━\n`;
                card += `🤖 <i>Samuel Mega Bot • Visão Pré-Jogo V20 (#${enviados})</i>`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'HTML' }).catch(() => {});
                await new Promise(r => setTimeout(r, 600));
            }

            console.log(`✅ ${enviados} cards da agenda do dia enviados ao Telegram com sucesso!`);
        } else {
            console.log("⚠️ Nenhuma partida agendada com horário foi identificada nesta busca.");
        }

    } catch (error) {
        console.error("❌ Erro no Radar V20:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

// Executa a cada 30 minutos (suficiente para agenda pré-jogo)
setInterval(executarAgendaHojeV20, 1800000);
executarAgendaHojeV20();
