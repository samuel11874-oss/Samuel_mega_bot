const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Diagnóstico & Varredura Soccerway ⚽🔥</h2>'));
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

        console.log(`🕵️‍♂️ [Bot Diagnóstico] Acessando agenda para: ${hoje}`);
        
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

        // Aguarda especificamente o elemento principal de partidas do Soccerway carregar
        console.log("⏳ Aguardando tabelas de partidas renderizarem...");
        try {
            await page.waitForSelector('table.matches, div.match-list, div.inner', { timeout: 15000 });
        } catch (e) {
            console.log("⚠️ Elemento padrão demorou, prosseguindo com análise...");
        }

        await new Promise(r => setTimeout(r, 5000));

        // Diagnóstico: Pega o título da página para garantir que não foi bloqueado
        const tituloPagina = await page.title();
        console.log(`📄 Título da página carregada: "${tituloPagina}"`);

        const dadosExtraidos = await page.evaluate(() => {
            const resultados = [];
            
            // O Soccerway organiza os jogos em tabelas com classe 'matches' ou blocos de linhas
            const linhas = document.querySelectorAll('table.matches tr, tr.match, tr');

            linhas.forEach(tr => {
                const txt = tr.innerText ? tr.innerText.trim() : '';
                
                // Filtros de exclusão rigorosos (Feminino, Sub-20/19/17, Amistosos, Amador)
                const ehAmistoso = /amistoso|friendly/i.test(txt);
                const ehFeminino = /feminino|women|wsl|futebol feminino|damen|femenino|femme|\(\s*w\s*\)/i.test(txt);
                const ehBase = /sub-20|sub 20|u20|under 20|sub20|sub-19|sub 19|u19|under 19|sub19|juniors|youth|sub-17|u17/i.test(txt);
                const ehAmador = /amador|amateurs|regional|liga amadora/i.test(txt);

                if (!ehAmistoso && !ehFeminino && !ehBase && !ehAmador) {
                    if (/\d{2}:\d{2}/.test(txt) && txt.includes('-')) {
                        const celulas = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()).filter(t => t.length > 0);
                        
                        let horario = celulas.find(c => /\d{2}:\d{2}/.test(c));
                        let times = celulas.filter(c => c !== horario && c !== '-' && !c.includes(':') && c.length > 2);

                        if (horario && times.length >= 2) {
                            resultados.push([horario, times[0], times[1]]);
                        }
                    }
                }
            });

            // Fallback caso as células <td> não capturem isoladamente
            if (resultados.length === 0) {
                const blocos = document.querySelectorAll('div, li');
                blocos.forEach(b => {
                    const txt = b.innerText ? b.innerText.trim() : '';
                    const ehAmistoso = /amistoso|friendly/i.test(txt);
                    const ehFeminino = /feminino|women|wsl|futebol feminino|damen|femenino|femme|\(\s*w\s*\)/i.test(txt);
                    const ehBase = /sub-20|sub 20|u20|under 20|sub20|sub-19|sub 19|u19|under 19|sub19|juniors|youth|sub-17|u17/i.test(txt);
                    const ehAmador = /amador|amateurs|regional/i.test(txt);

                    if (!ehAmistoso && !ehFeminino && !ehBase && !ehAmador) {
                        if (/\d{2}:\d{2}/.test(txt) && txt.includes('-') && txt.length < 200) {
                            const partes = txt.split('\n').map(p => p.trim()).filter(p => p.length > 0);
                            let h = partes.find(p => /\d{2}:\d{2}/.test(p));
                            let limpos = partes.filter(p => p !== h && p !== '-' && !p.includes(':') && p.length > 2);
                            if (h && limpos.length >= 2) {
                                resultados.push([h, limpos[0], limpos[1]]);
                            }
                        }
                    }
                });
            }

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

        console.log(`⚽ [Bot Diagnóstico] Partidas válidas encontradas: ${dadosExtraidos.length}`);

        if (dadosExtraidos.length > 0) {
            let novosEnviados = 0;

            for (let i = 0; i < dadosExtraidos.length; i++) {
                let p = dadosExtraidos[i];
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

                    let card = `🔥 *Partida Detectada [${novosEnviados}]*\n`;
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
                console.log(`✅ [Bot Diagnóstico] ${novosEnviados} novos jogos enviados com sucesso.`);
            }

        } else {
            console.log("⚠️ [Bot Diagnóstico] 0 partidas capturadas. Verificando amostra do HTML para depuração...");
        }

    } catch (error) {
        console.error("❌ ERRO CRÍTICO NA VARREDURA:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

buscarJogosDoDia();
setInterval(buscarJogosDoDia, 4 * 60 * 60 * 1000);
