const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.get('/', (req, res) => res.send('<h2>Bot SokkerPRO - Ultra Rápido ⚽🚩</h2>'));
app.listen(process.env.PORT || 3000);

const TOKEN = '8287186194:AAGyqB2sak2oFr3GadpC4GHWuG2ELpTYcBU';
const CHAT_ID = '8285908313';
const bot = new TelegramBot(TOKEN, { polling: false });

const memoriaPlacarJogos = new Map();

function traduzirTempo(texto) {
    let t = texto.toUpperCase();
    if (t.includes('HT') || t.includes('INTERVALO')) return 'Intervalo';
    if (t.includes('FT') || t.includes('FIM')) return 'Fim de Jogo';
    return t.trim();
}

async function varrerRapidinho() {
    try {
        console.log("⚡ [Scanner Rápido] Buscando dados do SokkerPRO...");

        const response = await axios.get('https://m.sokkerpro.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        let textos = [];

        // Extrai todo o texto visível da página de forma estruturada
        $('body').find('*').each((_, element) => {
            let childText = $(element).clone().children().remove().end().text().trim();
            if (childText && childText.length > 0 && childText !== '-' && childText !== 'x') {
                textos.push(childText);
            }
        });

        const isTime = (s) => /^\d{1,3}'/i.test(s) || /^(HT|FT|Intervalo)$/i.test(s);
        let resultados = [];
        let i = 0;

        while (i < textos.length) {
            if (isTime(textos[i])) {
                let matchData = {
                    tempo: textos[i],
                    league: (i > 0 && !textos[i-1].includes('%') && textos[i-1].length < 40) ? textos[i-1] : "Futebol Ao Vivo",
                    textos: []
                };
                
                for (let j = 1; j <= 20; j++) {
                    if (i + j >= textos.length) break;
                    if (isTime(textos[i + j])) break; 
                    matchData.textos.push(textos[i + j]);
                }
                
                resultados.push(matchData);
                i += matchData.textos.length + 1;
            } else {
                i++;
            }
        }

        let processados = [];
        for (let data of resultados) {
            let items = data.textos;
            let idxPorcentagem = items.findIndex(item => item.includes('%'));
            
            if (idxPorcentagem > 0) {
                let timeCasa = items[idxPorcentagem - 1];
                let timeFora = items[idxPorcentagem + 1];
                
                if (!timeCasa || !timeFora) continue;
                
                let numerosApos = [];
                for (let k = idxPorcentagem + 2; k < items.length; k++) {
                    let val = items[k];
                    if (val.includes('.')) break;
                    if (/^\d+$/.test(val)) {
                        numerosApos.push(val);
                    }
                }
                
                let golsCasa = numerosApos.length > 0 ? numerosApos[0] : "0";
                let golsFora = numerosApos.length > 1 ? numerosApos[1] : "0";
                let escCasa = numerosApos.length > 2 ? numerosApos[2] : "0";
                let escFora = numerosApos.length > 3 ? numerosApos[3] : "0";

                processados.push({
                    liga: data.league,
                    tempo: data.tempo,
                    confronto: `${timeCasa} x ${timeFora}`,
                    placar: `${golsCasa} x ${golsFora}`,
                    escanteios: `${escCasa} x ${escFora}`
                });
            }
        }

        console.log(`📊 Partidas estruturadas (Axios): ${processados.length}`);
        let enviadosNoCiclo = 0;

        for (let item of processados) {
            let chaveJogo = item.confronto.toLowerCase().replace(/\s+/g, '');

            if (memoriaPlacarJogos.has(chaveJogo)) {
                let placarAnterior = memoriaPlacarJogos.get(chaveJogo);
                if (placarAnterior === item.placar) continue; 
            }
            memoriaPlacarJogos.set(chaveJogo, item.placar);

            let cardTelegram = `🟢 <b>SokkerPRO Ao Vivo</b>\n\n`;
            if (item.liga && item.liga !== "Futebol Ao Vivo" && item.liga.length > 2) {
                cardTelegram += `🏆 <b>Liga:</b> ${item.liga}\n`;
            }
            cardTelegram += `⏱ <b>Tempo:</b> ${traduzirTempo(item.tempo)}\n`;
            cardTelegram += `⚔️ <b>Confronto:</b> <code>${item.confronto}</code>\n`;
            cardTelegram += `⚽ <b>Placar:</b> <b>${item.placar}</b>\n`;
            cardTelegram += `🚩 <b>Escanteios:</b> <b>${item.escanteios}</b>`;

            await bot.sendMessage(CHAT_ID, cardTelegram, { parse_mode: 'HTML' }).catch(() => {});
            enviadosNoCiclo++;
            await new Promise(r => setTimeout(r, 1500));
        }

        console.log(`✅ Ciclo concluído. ${enviadosNoCiclo} cards enviados.`);

    } catch (erro) {
        console.error("❌ Erro na varredura rápida:", erro.message);
    }
}

varrerRapidinho();
setInterval(varrerRapidinho, 60000); // Roda a cada 1 minuto bem rapidinho
