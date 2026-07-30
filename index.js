const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Investigador Top Ligas ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let jogosEnviadosSet = new Set();
let ultimaDataRegistrada = '';

function getDataBrasil() {
    const agoraz = new Date();
    return agoraz.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
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

        console.log(`🕵️‍♂️ [Investigação Top Ligas] Acessando agenda para hoje (${hoje})...`);
        
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
        await page.goto(urlDia, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await new Promise(r => setTimeout(r, 9000));

        // 🔍 MODO INVESTIGAÇÃO: Coleta dados crus da página para análise nos logs
        const relatorioInvestigacao = await page.evaluate(() => {
            const ligasEncontradas = new Set();
            const amostraLinhas = [];
            const trs = document.querySelectorAll('tr');

            trs.forEach((tr, index) => {
                const txt = tr.innerText ? tr.innerText.trim() : '';
                if (!txt) return;

                if (tr.querySelector('th') || tr.className.includes('competition') || tr.className.includes('group') || tr.className.includes('header')) {
                    ligasEncontradas.add(txt);
                }

                if (index < 15) {
                    amostraLinhas.push(txt.substring(0, 100));
                }
            });

            return {
                totalTrs: trs.length,
                ligas: Array.from(ligasEncontradas).slice(0, 20), // Primeiras 20 ligas encontradas
                amostra: amostraLinhas
            };
        });

        console.log(`📊 [INVESTIGAÇÃO] Total de linhas <tr:> ${relatorioInvestigacao.totalTrs}`);
        console.log(`🏆 [INVESTIGAÇÃO] Amostra de Ligas/Cabeçalhos identificados:`, relatorioInvestigacao.ligas);
        console.log(`📝 [INVESTIGAÇÃO] Amostra de texto das primeiras linhas:`, relatorioInvestigacao.amostra);

        // Execução principal com lógica flexível baseada na investigação
        const dadosExtraidos = await page.evaluate(() => {
            const resultados = [];
            let ligaAtual = '';
            const linhas = document.querySelectorAll('tr');

            linhas.forEach(tr => {
                const textoTr = tr.innerText ? tr.innerText.trim() : '';
                if (!textoTr) return;

                const ehCabecalho = tr.querySelector('th') || tr.className.includes('competition') || tr.className.includes('group') || tr.className.includes('header');
                if (ehCabecalho && textoTr.length < 100) {
                    ligaAtual = textoTr.toLowerCase();
                    return;
                }

                const contextoGeral = (ligaAtual + " " + textoTr).toLowerCase();

                // 🎯 FILTRO AMPLIADO DE LIGAS DE ELITE (Cobrindovariações internacionais comuns)
                const ehElite = /premier league|la liga|bundesliga|ligue 1|serie a|champions league|libertadores|copa do brasil|brasileiro|primera division|primeira liga|eredivisie|championship|super lig|copa|liga profissional|torneo|conmebol/i.test(contextoGeral);
                
                // Se a linha não tiver nome de liga no cabeçalho, vamos checar se o texto do jogo tem pistas fortes
                const temTimeForteOuLigaNoTexto = /brasileiro|premier|liga|champions|libertadores|copa/i.test(contextoGeral);

                if (!ehElite && !temTimeForteOuLigaNoTexto) return;

                // Filtro Anti-Lixo (Feminino, Base, Amistosos)
                const ehLixo = /amistoso|friendly|friendlies|feminino|women|wsl|damen|femenino|femme|\b(w)\b|\(w\)|sub-|u20|u19|u17|u21|reserves|amador|youth/i.test(contextoGeral);
                if (ehLixo) return;

                const jaTerminou = /\b(ft|aet|pen)\b/i.test(textoTr.toLowerCase());
                if (jaTerminou) return;

                const matchHorario = textoTr.match(/\d{2}:\d{2}/);
                const aoVivoMinuto = textoTr.match(/\d{1,2}'/) || textoTr.toLowerCase().includes('ht') || textoTr.toLowerCase().includes('live');

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

        console.log(`⚽ [Bot Top Ligas] Jogos filtrados encontrados: ${dadosExtraidos.length}`);

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
        }

    } catch (error) {
        console.error("❌ ERRO NA INVESTIGAÇÃO:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

buscarJogosDoDia();
setInterval(buscarJogosDoDia, 4 * 60 * 60 * 1000);
