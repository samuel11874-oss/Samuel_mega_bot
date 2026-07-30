const path = require('path');
process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache');

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TelegramBot = require('node-telegram-bot-api');

puppeteer.use(StealthPlugin());

const app = express();
app.get('/', (req, res) => res.send('<h2>Samuel_mega_bot - Monitor Ao Vivo ⚽🔥</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

async function buscarJogosAoVivo() {
    let browser = null;
    try {
        console.log("🕵️‍♂️ [Bot US] Acessando e buscando jogos AO VIVO (Código Original Corrigido)...");
        
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
        await page.setViewport({ width: 1366, height: 768 });

        console.log("🌐 [Bot US] Acessando us.soccerway.com...");
        await page.goto('https://us.soccerway.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        await new Promise(r => setTimeout(r, 4000));
        
        try {
            console.log("🔍 [Bot US] Procurando e clicando na aba 'LIVE'...");
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, span, div'));
                const abaLive = links.find(el => el.innerText && el.innerText.trim() === 'LIVE');
                if (abaLive) abaLive.click();
            });
            // Tempo de espera garantido para carregar os blocos do LIVE após o clique
            await new Promise(r => setTimeout(r, 6000));
        } catch (e) {
            console.log("⚠️ Não foi possível clicar na aba Live diretamente.");
        }

        // --- CÓDIGO ORIGINAL DE RASPAGEM (O QUE ACHOU AS 34 PARTIDAS) ---
        const partidas = await page.evaluate(() => {
            const resultados = [];
            const blocos = document.querySelectorAll('tr, div, li');

            blocos.forEach(b => {
                const txt = b.innerText ? b.innerText.trim() : '';
                
                const ehLixo = txt.includes('FAVORITES') || txt.includes('PREMIER LEAGUE') || 
                               txt.includes('Copyright') || txt.includes('Soccerway') || txt.includes('Sign up') || 
                               txt.length < 10 || txt.length > 140;

                if (!ehLixo) {
                    // Expandimos a validação para capturar também minutos puros (ex: 39, 88) e acréscimos
                    if ((txt.includes("'") || txt.includes("Half Time") || txt.includes("HT") || txt.includes("FT") || /\b\d{1,2}\b/.test(txt) || /\d+[\s-]+\d+/.test(txt))) {
                        const formatado = txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        
                        if (formatado.length >= 3 && !resultados.some(r => r.join('|') === formatado.join('|'))) {
                            resultados.push(formatado);
                        }
                    }
                }
            });
            return resultados;
        });

        console.log(`⚽ [Bot US] Blocos de partidas brutas capturados: ${partidas.length}`);

        if (partidas.length > 0) {
            let enviados = 0;
            
            for (let i = 0; i < partidas.length; i++) {
                if(enviados >= 25) break; 

                let p = partidas[i];
                
                // 1. Identifica o tempo
                let tempo = p.find(item => item.includes("'") || item.includes("Half") || item === 'HT' || item === 'FT' || item === 'Full-time' || /^\d{1,2}$/.test(item) || /^\d+\+\d+$/.test(item)) || p[0] || "Ao Vivo";

                // 🔴 A CORREÇÃO DOS JOGOS ENCERRADOS: Se tiver FT ou Full-time na linha, pula esse jogo!
                if (p.some(item => /FT|Full-time|Finished/i.test(item))) {
                    continue; 
                }

                // 2. Separa os times (nomes têm letras, então length > 2 e não são apenas números)
                let times = p.filter(x => x !== tempo && x !== '-' && !x.includes(':') && x.length > 2 && !/^\d+$/.test(x));
                
                // 3. Separa os números soltos para pegar os gols
                let numeros = p.filter(x => x !== tempo && /^\d+$/.test(x));
                
                let placarHifen = p.find(item => /^\d+\s*-\s*\d+$/.test(item));

                let timeA = times[0];
                let timeB = times[1];

                if (!timeA || !timeB) continue;

                let golA = "0", golB = "0";

                // 🔴 A CORREÇÃO DO PLACAR: Agora ele pega os números corretos e não zera
                if (placarHifen) {
                    let partes = placarHifen.split('-');
                    golA = partes[0].trim();
                    golB = partes[1].trim();
                } else if (numeros.length >= 2) {
                    golA = numeros[0];
                    golB = numeros[1];
                } else {
                    continue; // Se não tem placar real sendo exibido, ignora para não mandar falso 0x0
                }

                // Deixa visualmente bonito adicionando o ' no minuto se ele não vier (ex: 39 -> 39')
                let tempoFormatado = tempo;
                if (/^\d+$/.test(tempo) || /^\d+\+\d+$/.test(tempo)) tempoFormatado += "'";

                enviados++;
                
                let card = `⚡ *Partida Ao Vivo [${enviados}]*\n`;
                card += `────────────────────\n`;
                card += `⏱ *Tempo:* \`${tempoFormatado}\`\n`;
                card += `⚽ **${timeA}** x **${timeB}**\n`;
                card += `📊 *Placar:* \` ${golA} x ${golB} \`\n`;
                card += `📐 *Cantos / Cartões:* \`Aguardando dados oficiais\`\n`;
                card += `────────────────────`;

                await bot.sendMessage(CHAT_ID, card, { parse_mode: 'Markdown' }).catch(()=>{});
                
                await new Promise(r => setTimeout(r, 600));
            }
            console.log(`✅ ${enviados} partidas rolando agora foram enviadas!`);
        } else {
            bot.sendMessage(CHAT_ID, "⚠️ *Nenhum jogo encontrado no momento da varredura.*", { parse_mode: 'Markdown' }).catch(()=>{});
        }

    } catch (error) {
        console.error("❌ Erro:", error.message);
        bot.sendMessage(CHAT_ID, `❌ *Erro no Bot:* ${error.message}`, { parse_mode: 'Markdown' }).catch(()=>{});
    } finally {
        if (browser) await browser.close();
    }
}

setInterval(buscarJogosAoVivo, 600000);
buscarJogosAoVivo();
