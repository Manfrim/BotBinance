const venom = require('venom-bot');
const fetch = require('node-fetch');  // Adicionando o import do 'node-fetch' para garantir que o 'fetch' funcione no Node.js
const axios = require('axios');

let verifica = false;
const meuNumero = '5516981388103@c.us'; // seu número no formato correto
const fred = '9d66bba219d842895ea66191eff2a2fe';
venom
  .create({
    session: 'bot-binance',   // Nome da sessão (pode ser qualquer string)
    headless: true,          // Abre o navegador visivelmente
    useChrome: true,          // Usa o Chrome instalado (caso tenha)
    devtools: false,
    browserArgs: [''],
    disableSpins: true,
    disableWelcome: true,
  })
  .then((client) => start(client))
  .catch((error) => {
    console.log('Erro ao iniciar o Venom:', error);
  });

function start(client) {
  client.onMessage(async (message) => {
    if (message.body == '/help') {
      client.sendText(message.from, 'Comandos disponíveis:\n-/preço <moeda> exemplo: /preço btc\n-/diferença <moeda> exemplo: /diferença btc\n-/top10\n-/historico <moeda>\n/desemprego Desemprego dos EUA\n-/inflação EUA ou Projeção');
    } else if (message.body.toLowerCase().startsWith('/preço')) {
      const string = message.body.slice(6).trim().toUpperCase();
      const price = await getCoinPrice(string);
      client.sendText(message.from, `🪙 O preço atual do ${string} é: $ ${price} USD`);
    } else if (message.body.toLowerCase().startsWith('/diferença')) {
      const string = message.body.slice(10).trim().toUpperCase();
      const { price10MinAgo, price1MinAgo } = await getDiferencePrices(string);
      client.sendText(message.from, `🪙 O preço da moeda ${string} há 10 minutos é: $ ${price10MinAgo} USD`);
      client.sendText(message.from, `🪙 O preço da moeda ${string} há 1 minuto é: $ ${price1MinAgo} USD`);
      const percent = (((price10MinAgo - price1MinAgo) / price10MinAgo) * 100).toFixed(2);
      client.sendText(message.from, `🪙 A diferença da moeda ${string} em 10 minutos é $ ${price10MinAgo - price1MinAgo} USD (${Math.abs(percent)}%)`);
    } else if (message.body == '/vitin') {
      client.sendText(message.from, 'VITINHO QUEIMOU NA CHURRASQUEIRA');
    } else if (message.body == '/top10') {
      const ranking = await getTop10Cryptos();
      client.sendText(message.from, ranking);
    }else if (message.body.toLowerCase().startsWith('/historico')) {
      const coin = message.body.split(' ')[1] || 'BTC';
      const texto = await getBinancePriceHistory(`${coin.toUpperCase()}USDT`);
      client.sendText(message.from, texto);
    }else if(message.body == '/desemprego'){
      getUnemploymentRate().then((messagem) => {
        client.sendText(message.from, messagem);
      });
    }else if(message.body.startsWith('/inflação')){
      const escolha = message.body.split(' ')[1];
      if(escolha == 'EUA'){
        getInflation().then((messagem) => {
          client.sendText(message.from, messagem);
        });
      }else if(escolha == 'Projeção'){
        ProjecaoInflacao().then((messagem) =>{
          client.sendText(message.from, messagem);
        });
      }else{
        message.sendText(message.from, 'Não consegui entender');
      }
    }
  });
}

// Função que consulta a API da Binance para o preço da moeda
async function getCoinPrice(coin) {
  try {
    // Utilizando a template string corretamente
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${coin}USDT`);
    const data = await response.json();
    return parseFloat(data.price).toFixed(2); // Retorna o preço com 2 casas decimais
  } catch (error) {
    return 'Erro ao buscar o preço';
  }
}

async function getDiferencePrices(coin) {
  try {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol: coin + 'USDT',
        interval: '1m',
        startTime: tenMinutesAgo,
        limit: 10 // 10 velas de 1 minuto (de 10 minutos atrás até agora)
      }
    });
    const candles = response.data;
    const price10MinAgo = parseFloat(candles[0][4]); // fechamento da vela de 10 minutos atrás
    const price1MinAgo = parseFloat(candles[9][4]);  // fechamento da vela de 1 minuto atrás
    return {
      price10MinAgo,
      price1MinAgo
    };
  } catch (error) {
    console.error('Erro ao buscar preços:', error.message);
    return null;
  }
}

async function getTop10Cryptos() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 10,
        page: 1,
        sparkline: false
      }
    });

    const topCoins = response.data;

    let ranking = '🏆 *Top 10 Criptomoedas por Market Cap*\n\n';
    topCoins.forEach((coin, index) => {
      ranking += `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()}): $${coin.current_price.toLocaleString()} USD\n`;
    });

    return ranking;

  } catch (error) {
    console.error('Erro ao buscar top 10 criptos:', error.message);
    return '❌ Erro ao buscar ranking das criptos.';
  }
}

async function getBinancePriceHistory(symbol = 'BTCUSDT', days = 7) {
  try {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000; // dias para milissegundos

    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol: symbol.toUpperCase(),
        interval: '1d',
        startTime: startTime,
        endTime: endTime,
        limit: days
      }
    });

    const candles = response.data;

    let texto = `📊 *Histórico dos últimos ${days} dias - ${symbol}*\n\n`;
    candles.forEach((candle) => {
      const date = new Date(candle[0]).toLocaleDateString();
      const close = parseFloat(candle[4]).toFixed(2);
      texto += `📅 ${date} - 💰 $${close} USD\n`;
    });

    return texto;

  } catch (error) {
    console.error('Erro na Binance API:', error.message);
    return '❌ Erro ao buscar histórico de preços.';
  }
}
async function getUnemploymentRate() {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=UNRATE&api_key=${fred}&file_type=json`;

  try {
    const response = await axios.get(url);
    const unemploymentData = response.data.observations;
    const latestUnemployment = unemploymentData[unemploymentData.length - 1].value; // Pega o último valor
    return `A taxa de desemprego nos EUA é: ${latestUnemployment}%`;
  } catch (error) {
    console.error('Erro ao acessar os dados do FRED:', error);
    return 'Erro ao buscar dados de desemprego.';
  }
}

async function getInflation() {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCNS&api_key=${fred}&file_type=json`;

  try {
    // Faz a requisição à API do FRED
    const response = await axios.get(url);
    
    // Obtém os dados de inflação (CPI)
    const inflationData = response.data.observations;

    // Pegando os valores de CPI mais antigos e mais recentes (últimos dois dados disponíveis)
    const latestInflation = inflationData[inflationData.length - 1].value;
    const previousInflation = inflationData[inflationData.length - 2].value;

    // Verifique se os dados estão presentes
    if (!latestInflation || !previousInflation) {
      return 'Não há dados suficientes para calcular a inflação.';
    }

    // Calculando a inflação (variação percentual)
    const inflationPercentage = ((latestInflation - previousInflation) / previousInflation) * 100;

    // Retorna a inflação calculada
    return `A inflação nos EUA nos últimos dois meses foi de: ${inflationPercentage.toFixed(2)}%`;
  } catch (error) {
    console.error('Erro ao acessar os dados do FRED:', error);
    return 'Erro ao buscar dados de inflação.';
  }
}

async function ProjecaoInflacao() {
  try {
    const response = await axios.get('https://api.stlouisfed.org/fred/series/observations', {
      params: {
        series_id: 'CPIAUCSL',
        api_key: fred, // substitua pela sua chave do FRED
        file_type: 'json',
        observation_start: '2025-01-01'
      }
    });

    const dados = response.data.observations;

    const valorJaneiro = parseFloat(dados[0].value);
    const valorAtual = parseFloat(dados[dados.length - 1].value);

    const inflacaoAcumulada = ((valorAtual - valorJaneiro) / valorJaneiro) * 100;
    const meses = dados.length;

    const fator = 1 + inflacaoAcumulada / 100;
    const inflacaoAnualProjetada = (Math.pow(fator, 12 / meses) - 1) * 100;

    return `📈 Inflação acumulada nos EUA em ${meses} meses: ${inflacaoAcumulada.toFixed(2)}%\n📊 Projeção anualizada: ${inflacaoAnualProjetada.toFixed(2)}%`;

  } catch (error) {
    console.error('Erro ao buscar inflação:', error.message);
    return '❌ Não foi possível buscar a inflação.';
  }
}
/*
async function disparo() {
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;

  try {
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol: 'BTCBRL',
        interval: '1m',
        startTime: tenMinutesAgo,
        limit: 10
      }
    });

    const candles = response.data;

    // Verifica se realmente obteve 10 candles
    if (!candles || candles.length < 10) {
      return '⚠️ Dados insuficientes para calcular variação de preço.';
    }

    const price10MinAgo = parseFloat(candles[0][4]);
    const priceNow = parseFloat(candles[9][4]);

    const diff = priceNow - price10MinAgo;
    const percent = (diff / price10MinAgo) * 100;

    if (Math.abs(percent) >= 1) {
      const direction = percent > 0 ? 'subiu' : 'caiu';
      return `⚠️ Alerta: O BTC ${direction} ${Math.abs(percent).toFixed(2)}% nos últimos 10 minutos!`;
    } else {
      return `ℹ️ O Bitcoin teve pouca variação: ${percent.toFixed(2)}% nos últimos 10 minutos.`;
    }

  } catch (err) {
    console.error('Erro ao buscar dados:', err.message);
    return '❌ Erro ao buscar dados do BTC.';
  }
}
*/
