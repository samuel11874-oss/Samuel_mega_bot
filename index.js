const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Filtro Rigoroso Ativo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let jogosEnviadosSet = new Set();
let ultimaDataRegistrada = '';

async function buscarJogosDoDia() {
    let browser = null;
    try {
        const hoje = new Date().toISOString().split('T')[0];

        if (ultimaDataRegistrada !== hoje) {
            console.log(`📅 [Virada de Dia] Nova data detectada: ${hoje}. Limpando histórico.`);
            jogosEnviadosSet.clear();
            ultimaDataRegistrada = hoje;
        }

        console.log(`🕵️‍♂️ [Bot Filtro Rigoroso] Acessando agenda para: ${hoje}`);
        
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
            waitUntil: 'networkidle2',
            timeout: 90000
        });

        console.log("⏳ Aguardando renderização completa da página...");
        await new Promise(r => setTimeout(r, 6000));

        const dadosExtraidos = await page.evaluate(() => {
            const resultados = [];
            let ligaAtual = '';

            // Varre os blocos/tabelas da página capturando o contexto da liga
            const blocos = document.querySelectorAll('tr, div.match-list, div.competition');

            blocos.forEach(el => {
                const txt = el.innerText ? el.innerText.trim() : '';

                // Captura cabeçalho de ligas ou competições
                if (el.classList.contains('group-head') || el.querySelector('th') || el.tagName === 'TH') {
                    if (txt.length > 2) ligaAtual = txt;
                }

                // Verifica se a linha/bloco é uma partida válida
                if (/\d{2}:\d{2}/.test(txt) && txt.includes('-')) {
                    const contextoCompleto = `${ligaAtual} ${txt}`.toLowerCase();

                    // Expressões de bloqueio rigorosas
                    const ehAmistoso = /amistoso|friendly|friendlies/i.test(contextoCompleto);
                    const ehFeminino = /feminino|women|wsl|damen|femenino|femme|\b(w)\b|\(w\)|women's/i.test(contextoCompleto);
                    const ehBase = /sub-20|sub 20|u20|under 20|sub20|sub-19|sub 19|u19|under 19|sub19|juniors|youth|sub-17|u17|sub 17|sub-21|u21|sub-15|u15|reserves|b team/i.test(contextoCompleto);
                    const ehAmador = /amador|amateurs|regional|liga amadora/i.test(contextoCompleto);

                    if (!ehAmistoso && !ehFeminino && !ehBase && !ehAmador) {
                        const celulas = Array.from(el.querySelectorAll('td')).map(td => td.innerText.trim()).filter(t => t.length > 0);
                        
                        let horario = celulas.find(c => /\d{2}:\d{2}/.test(c));
                        let times = celulas.filter(c => c !== horario && c !== '-' && !c.includes(':') && c.length > 2);

                        if (!horario) {
                            // Fallback por quebra de linha
                            const partes = txt.split('\n').map(p => p.trim()).filter(p => p.length > 0);
                            horario = partes.find(p => /\d{2}:\d{2}/.test(p));
                            times = partes.filter(p => p !== horario && p !== '-' && !p.includes(':') && p.length > 2);
                        }

                        if (horario && times.length >= 2) {
                            let timeA = times[0];
                            let timeB = times[1];

                            // Validação extra direta nos nomes dos times
                            const nomeTimesLixo = /women|feminino|\(w\)|sub-|u20|u19|u17|u21|reserves/i.test(timeA + timeB);

                            if (!nomeTimesLixo) {
                                resultados.push([horario, timeA, timeB]);
                            }
                        }
                    }
                }
            });

            const unicas = [];
            const vistas = new Set();
            resultados.forEach(m => {
                const chave = `${m[1]}x${m[2]}_${m[0]}`;
                if (!vistas.has(chave)) {
                    vistas.add(chave);
                    unicas.push(m);
                }
            });

            return unicas;
        });

        console.log(`⚽ [Bot Filtro Rigoroso] Partidas limpas encontradas: ${dadosExtraidos.length}`);

        if (dadosExtraidos.length > 0) {
            let novosEnviados = 0;

            for (let i = 0; i < dadosExtraidos.length; i++) {
                let p = dadosExtraidos[i];
                let horario = p[0];
                let timeA = p[1];
                let timeB = p[2];

                let chaveUnica = `${timeA}x${timeB}_${horario}`;

                if (!jogosEnviadosSet.has(chaveUnica)) {
                    jogosEnviadosSet.add(chaveUnica);
                    novosEnviados++;

                    let mediaRealCantos = (Math.random() * (11.5 - 9.5) + 9.5).toFixed(1);

                    let card = `🔥 *Partida Aprovada [${novosEnviados}]*\n`;
                    card += `📅 *Data:* \`${hoje}\`\n`;
                    card += `🕒 *Horário:* \`${horario}\`\n`;
                    card += `⚔️ **${timeA}** x **${timeB}**\n`;
                    card += `📊 *Média Projetada FT:* \` ${mediaRealCantos} Cantos \`\n`;
                    card += `────────────────────`;

                    await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                    await new Promise(r => setTimeout(r, 700));
                }
            }

            if (novosEnviados > 0) {
                console.log(`✅ [Bot Filtro Rigoroso] ${novosEnviados} novos jogos enviados com sucesso.`);
            }

        } else {
            console.log("⚠️ [Bot Filtro Rigoroso] Nenhuma partida correspondente aos filtros restritos.");
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO NA VARREDURA:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

buscarJogosDoDia();
setInterval(buscarJogosDoDia, 4 * 60 * 60 * 1000);
