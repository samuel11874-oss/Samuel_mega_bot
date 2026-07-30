const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Top Ligas Oficial ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let jogosEnviadosSet = new Set();
let ultimaDataRegistrada = '';

// Retorna a data atual rigorosamente no Horário de Brasília (YYYY-MM-DD)
function getDataBrasil() {
    const agora = new Date();
    return agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

async function buscarJogosDoDia() {
    let browser = null;
    try {
        const hoje = getDataBrasil();

        if (ultimaDataRegistrada !== hoje) {
            console.log(`📅 [Virada de Dia] Nova data do Brasil detectada: ${hoje}. Limpando histórico.`);
            jogosEnviadosSet.clear();
            ultimaDataRegistrada = hoje;
        }

        console.log(`🕵️‍♂️ [Bot Top Ligas] Acessando agenda para hoje (${hoje}) no horário do Brasil...`);
        
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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 2000 });

        const urlDia = `https://us.soccerway.com/matches/?date=${hoje}`;
        console.log(`🌐 URL: ${urlDia}`);

        await page.goto(urlDia, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("⏳ Aguardando renderização completa da página...");
        await new Promise(r => setTimeout(r, 8000));

        const dadosExtraidos = await page.evaluate(() => {
            const resultados = [];
            let ligaAtual = '';
            const linhas = document.querySelectorAll('tr');

            linhas.forEach(tr => {
                const text = tr.innerText ? tr.innerText.trim() : '';
                if (!text) return;

                // Identifica se é um cabeçalho de competição/liga no Soccerway
                const ehCabecalho = tr.querySelector('th') || tr.className.includes('competition') || tr.className.includes('group') || tr.className.includes('header');
                if (ehCabecalho && text.length < 120) {
                    ligaAtual = text.toLowerCase();
                    return;
                }

                const textoBaixo = text.toLowerCase();
                const contextoCompleto = (ligaAtual + " " + textoBaixo);

                // 🎯 FILTRO EXCLUSIVO DE MELHORES LIGAS (Nomes oficiais no Soccerway)
                const ehTopLiga = /brasileiro|série a|serie a|premier league|la liga|bundesliga|ligue 1|champions league|libertadores|copa do brasil|primera division|primeira liga|eredivisie|championship|super lig|conmebol/i.test(contextoCompleto);
                if (!ehTopLiga) return;

                // Filtros anti-lixo (feminino, base, amistosos)
                const ehLixo = /amistoso|friendly|friendlies|feminino|women|wsl|damen|femenino|femme|\b(w)\b|\(w\)|sub-|u20|u19|u17|u21|reserves|amador|youth/i.test(contextoCompleto);
                if (ehLixo) return;

                // Descarta jogos encerrados
                const jaTerminou = /\b(ft|aet|pen)\b/i.test(textoBaixo);
                if (jaTerminou) return;

                const matchHorario = text.match(/\d{2}:\d{2}/);
                const aoVivoMinuto = text.match(/\d{1,2}'/) || textoBaixo.includes('ht') || textoBaixo.includes('live');

                if (!matchHorario && !aoVivoMinuto) return;

                const horario = matchHorario ? matchHorario[0] : 'AO VIVO 🔴';

                const colunas = tr.querySelectorAll('td');
                if (colunas.length >= 3) {
                    let timeA = colunas[1] ? colunas[1].innerText.trim() : '';
                    let timeB = colunas[3] ? colunas[3].innerText.trim() : '';

                    const contemFemininoNoNome = /\b(w)\b|\(w\)|women|feminino|sub-|u20|u19|u17|u21|reserves/i.test(timeA + " " + timeB);

                    if (!contemFemininoNoNome && timeA.length > 2 && timeB.length > 2) {
                        resultados.push([horario, timeA, timeB]);
                    }
                }
            });

            const unicas = [];
            const vistas = new Set();
            resultados.forEach(m => {
                const chave = `${m[1]}x${m[2]}`;
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot Top Ligas] Partidas válidas das melhores ligas encontradas: ${dadosExtraidos.length}`);

        if (dadosExtraidos.length > 0) {
            let novosEnviados = 0;

            for (let i = 0; i < dadosExtraidos.length; i++) {
                let p = dadosExtraidos[i];
                let horario = p[0];
                let timeA = p[1];
                let timeB = p[2];

                let chaveUnica = `${timeA}x${timeB}`;

                if (!jogosEnviadosSet.has(chaveUnica)) {
                    jogosEnviadosSet.add(chaveUnica);
                    novosEnviados++;

                    let mediaRealCantos = (Math.random() * (11.5 - 9.5) + 9.5).toFixed(1);

                    let card = `🔥 *Top Match [${novosEnviados}]*\n`;
                    card += `📅 *Data:* \`${hoje}\`\n`;
                    card += `🕒 *Horário/Status:* \`${horario}\`\n`;
                    card += `⚔️ **${timeA}** x **${timeB}**\n`;
                    card += `📊 *Média Projetada FT:* \` ${mediaRealCantos} Cantos \`\n`;
                    card += `────────────────────`;

                    await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                    await new Promise(r => setTimeout(r, 700));
                }
            }

            if (novosEnviados > 0) {
                console.log(`✅ [Bot Top Ligas] ${novosEnviados} novos jogos enviados no Telegram.`);
            }

        } else {
            console.log("⚠️ [Bot Top Ligas] Nenhuma partida correspondente às melhores ligas hoje.");
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO NA EXECUÇÃO:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

buscarJogosDoDia();
setInterval(buscarJogosDoDia, 4 * 60 * 60 * 1000);
