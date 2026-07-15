const express = require('express');
const axios = require('axios');
const app = express();

app.get('/', (req, res) => res.send('Bot Debug: Conexão Bruta'));
app.listen(process.env.PORT || 3000);

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

async function testeConexao(nome, url) {
    try {
        const response = await axios.get(url, { headers: HEADERS });
        console.log(`\n--- RESULTADO: ${nome} ---`);
        console.log(`Status HTTP: ${response.status}`);
        console.log(`Tamanho do Conteúdo: ${response.data.length} caracteres`);
        console.log(`Início do HTML: ${response.data.substring(0, 300)}`);
        console.log(`--- FIM: ${nome} ---\n`);
    } catch (e) {
        console.log(`\n--- ERRO: ${nome} ---`);
        console.log(`Mensagem: ${e.message}`);
        if (e.response) console.log(`Status de Erro: ${e.response.status}`);
        console.log(`--- FIM: ${nome} ---\n`);
    }
}

async function rodarDebug() {
    await testeConexao('Wincomparator', 'https://www.wincomparator.com/');
    await testeConexao('BetExplorer', 'https://www.betexplorer.com/');
}

rodarDebug();
