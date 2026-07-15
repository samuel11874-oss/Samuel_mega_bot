const express = require('express');
const axios = require('axios');
const app = express();

app.get('/', (req, res) => res.send('Testando Fontes...'));
app.listen(process.env.PORT || 3000);

async function testarFontes() {
    console.log("🔍 [SISTEMA] Iniciando teste de compatibilidade com disfarce...");

    const sites = [
        { nome: 'Predictz', url: 'https://www.predictz.com/' },
        { nome: 'Wincomparator', url: 'https://www.wincomparator.com/' },
        { nome: 'BetExplorer', url: 'https://www.betexplorer.com/' },
        { nome: 'WhoScored', url: 'https://www.whoscored.com/' }
    ];

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    };

    for (const site of sites) {
        try {
            const response = await axios.get(site.url, { headers, timeout: 15000 });
            if (response.status === 200) {
                console.log(`✅ [SUCESSO] ${site.nome} respondeu.`);
            }
        } catch (error) {
            console.error(`❌ [ERRO] ${site.nome} falhou. Motivo: ${error.message}`);
        }
    }
    console.log("🔍 [SISTEMA] Ciclo de teste concluído.");
}

testarFontes();
