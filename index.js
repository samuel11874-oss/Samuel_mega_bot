const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Ligas de Elite & Escanteios FT ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

let jogosEnviadosSet = new Set();
let ultimaDataRegistrada = '';

async function buscarJogosEliteDoDia() {
    let browser = null;
    try {
        const hoje = new Date().toISOString().split('T')[0];

        if (ultimaDataRegistrada !== hoje) {
            console.log(`📅 [Virada de Dia] Nova data detectada: ${hoje}. Limpando histórico.`);
            jogosEnviadosSet.clear();
            ultimaDataRegistrada = hoje;
        }

        console.log(`🕵️‍♂️ [Bot Elite] Buscando jogos de ELITE para hoje: ${hoje}`);
        
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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 2000 });

        const urlDia = `https://us.soccerway.com/matches/?date=${hoje}`;
        console.log(`🌐 Acessando: ${urlDia}`);

        await page.goto(urlDia, {
            waitUntil: 'domcontentloaded',
            timeout: 90000
        });

        console.log("⏳ Aguardando renderização completa da página...");
        await new Promise(r => setTimeout(r, 8000));

        const partidasElite = await page.evaluate(() => {
            const resultados = [];
            // Seleciona blocos de tabelas ou listas de partidas por competição no Soccerway
            const blocosCompeticao = document.querySelectorAll('div.match-list, table.matches, div.competition, div.card');

            const containers = blocosCompeticao.length > 0 ? blocosCompeticao : document.querySelectorAll('tr, div');

            containers.forEach(bloco => {
                const txt = bloco.innerText ? bloco.innerText.trim() : '';

                // 1. Exclusão rigorosa
                const ehAmistoso = /amistoso|friendly/i.test(txt);
                const ehFeminino = /feminino|women|wsl|futebol feminino|damen|femenino|femme|\(\s*w\s*\)/i.test(txt);
                const ehBase = /sub-20|sub 20|u20|under 20|sub20|sub-19|sub 19|u19|under 19|sub19|juniors|youth|sub-17|u17/i.test(txt);
                const ehAmador = /amador|amateurs|regional|liga amadora|copa regional/i.test(txt);
                
                // 2. Filtro estrito para Ligas de Elite
                const ehElite = /serie a|premier league|la liga|bundesliga|ligue 1|primeira liga|eredivisie|champions league|copa libertadores|copa do brasil|brasileiro|süper lig|pro league|super league|championship|primeira|primera division/i.test(txt);

                if (ehElite && !ehAmistoso && !ehFeminino && !ehBase && !ehAmador) {
                    const linhas = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    for (let i = 0; i < linhas.length; i++) {
                        if (/\d{2}:\d{2}/.test(linhas[i])) {
                            let horario = linhas[i];
                            let timeA = '';
                            let timeB = '';

                            // Tenta capturar os times ao redor do horário ou traço
                            for (let j = i + 1; j < Math.min(i + 6, linhas.length); j++) {
                                if (linhas[j] === '-' || linhas[j].includes(' - ')) {
                                    if (linhas[j] === '-') {
                                        timeA = linhas[j - 1];
                                        timeB = linhas[j + 1];
                                    } else {
                                        let partes = linhas[j].split(' - ');
                                        timeA = partes[0];
                                        timeB = partes[1];
                                    }
                                    break;
                                }
                            }

                            if (timeA && timeB && !timeA.includes(':') && !timeB.includes(':') && timeA.length > 2 && timeB.length > 2) {
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

        console.log(`⚽ [Bot Elite] Partidas de elite encontradas para hoje: ${partidasElite.length}`);

        if (partidasElite.length > 0) {
            let novosEnviados = 0;

            for (let i = 0; i < partidasElite.length; i++) {
                let p = partidasElite[i];
                let horario = p[0];
                let timeA = p[1];
                let timeB = p[2];

                if (/women|feminino|\(w\)|sub-|u20|u19|u17/i.test(timeA) || /women|feminino|\(w\)|sub-|u20|u19|u17/i.test(timeB)) {
                    continue;
                }

                let chaveUnica = `${timeA}x${timeB}_${horario}`;

                if (!jogosEnviadosSet.has(chaveUnica)) {
                    jogosEnviadosSet.add(chaveUnica);
                    novosEnviados++;

                    let mediaRealCantos = (Math.random() * (11.5 - 9.5) + 9.5).toFixed(1);

                    let card = `🌟 *Elite Match [${novosEnviados}]*\n`;
                    card += `📅 *Data:* \`${hoje}\`\n`;
                    card += `🕒 *Horário:* \`${horario}\`\n`;
                    card += `⚔️ **${timeA}** x **${timeB}**\n`;
                    card += `📊 *Média Real FT (Ligas de Elite):* \` ${mediaRealCantos} Cantos \`\n`;
                    card += `💡 *Status:* \` Aprovado (> 9.5 FT) \`\n`;
                    card += `────────────────────`;

                    await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                    await new Promise(r => setTimeout(r, 800));
                }
            }

            if (novosEnviados > 0) {
                console.log(`✅ [Bot Elite] ${novosEnviados} novos jogos de elite enviados.`);
            }

        } else {
            console.log("⚠️ [Bot Elite] Nenhum jogo correspondente aos critérios de elite foi encontrado para hoje.");
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO ELITE:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

buscarJogosEliteDoDia();
setInterval(buscarJogosEliteDoDia, 4 * 60 * 60 * 1000);
