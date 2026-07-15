const express = require('express');
const axios = require('axios');
const app = express();

app.get('/', (req, res) => res.send('Testando Forebet...'));
app.listen(process.env.PORT || 3000);

async function testarForebet() {
    console.log("🔍 [SISTEMA] Iniciando teste no Forebet...");
    try {
        const response = await axios.get('https://www.forebet.com/pt/', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        if (response.status === 200) {
            console.log(`✅ [SUCESSO] Forebet respondeu corretamente.`);
        }
    } catch (error) {
        console.error(`❌ [ERRO] Forebet falhou. Motivo: ${error.message}`);
    }
}

testarForebet();
