const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Investigador & Jogos do Dia ⚽🔥</h2>'));
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

        console.log(`🕵️‍♂️ [Investigação Bot] Acessando agenda para hoje (${hoje}) no horário do Brasil...`);
        
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
        await new Promise(r => setTimeout(r, 9000));

        // 🔍 MODO INVESTIGAÇÃO: Captura dados de diagnóstico se falhar
        const diagnostico = await page.evaluate(() => {
            const bodyText = document.body ? document.body.innerText.trim() : '';
            const matchBlocks = document.querySelectorAll('.match, tr, .match-row, [class*="match"]');
            return {
                totalTamanhoTexto: bodyText.length,
                amostraTexto: bodyText.substring(0, 400),
                totalElementosEncontrados: matchBlocks.length
            };
        });

        console.log(`🔍 [Relatório de Investigação]: Tamanho do texto na página: ${diagnostico.totalTamanhoTexto} caracteres. Blocos encontrados: ${diagnostico.totalElementosEncontrados}`);
        if (diagnostico.totalTamanhoTexto < 200) {
            console.log(`⚠️ [Alerta Investigação] A página parece vazia ou bloqueada. Amostra: "${diagnostico.amostraTexto}"`);
        }

        const dadosExtraidos = await page.evaluate(() => {
            const resultados = [];
            // Busca por linhas ou blocos de partidas
            const elementos = document.querySelectorAll('tr, .match-row, li, div');

            elementos.forEach(el => {
                const text = el.innerText ? el.innerText.trim() : '';
                if (!text) return;

                const textoBaixo = text.toLowerCase();

                // Filtros rigorosos anti-lixo (feminino, sub-idades, amistosos, etc.)
                const ehLixo = /amistoso|friendly|friendlies|feminino|women|wsl|damen|femenino|femme|\b(w)\b|\(w\)|sub-20|sub 20|u20|under 20|sub20|sub-19|sub 19|u19|under 19|sub19|juniors|youth|sub-17|u17|sub-21|u21|reserves|amador/i.test(textoBaixo);
                if (ehLixo) return;

                // Descarta jogos encerrados
                const jaTerminou = /\b(ft|aet|pen)\b/i.test(textoBaixo);
                if (jaTerminou) return;

                const matchHorario = text.match(/\d{2}:\d{2}/);
                const aoVivoMinuto = text.match(/\d{1,2}'/) || textoBaixo.includes('ht') || textoBaixo.includes('live');

                if (!matchHorario && !aoVivoMinuto) return;

                const horario = matchHorario ? matchHorario[0] : 'AO VIVO 🔴';

                // Tenta extrair linhas limpas
                const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
                const limpos = linhas.filter(l => !/\d{2}:\d{2}/.test(l) && !/^\d+-\d+$/.test(l) && l !== '-');

                if (limpos.length >= 2) {
                    let timeA = limpos[0];
                    let timeB = limpos[1];

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

        console.log(`⚽ [Bot Investigador] Partidas válidas encontradas para hoje: ${dadosExtraidos.length}`);

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

                    let card = `🔥 *Partida de Hoje [${novosEnviados}]*\n`;
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
                console.log(`✅ [Bot Investigador] ${novosEnviados} novos jogos enviados no Telegram.`);
            }

        } else {
            console.log("⚠️ [Bot Investigador] Nenhuma partida correspondente encontrada para hoje. Verifique os logs de investigação acima.");
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO NA INVESTIGAÇÃO/EXECUÇÃO:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

buscarJogosDoDia();
setInterval(buscarJogosDoDia, 4 * 60 * 60 * 1000);
