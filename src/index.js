const readline = require('readline');
const { Client } = require('discord.js-selfbot-v13');
const { showMenu } = require('./commands/menu');
const { loginClient } = require('./commands/login');
const { loadSettings, loadAccountSettings, getCurrentUser, setCurrentUser } = require('./utils/settings');

const APPLICATION_ID = '1335650238089793566'; // Seu Application ID aqui

const client = new Client({
  checkUpdate: false,
  application: {
    id: APPLICATION_ID
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let loggedInUser = '';

const setupRPC = (client) => {
  let startTimestamp = Date.now();
  
  const updateRPC = () => {
    try {
      client.user.setActivity({
        applicationId: APPLICATION_ID,
        name: "ze delivery",
        type: "PLAYING",
        details: "bebendo...",
        state: "ausente",
        timestamps: {
          start: startTimestamp // Use o timestamp inicial fixo
        },
        assets: {
          large_image: "1335650238089793566/a",
          large_text: "Sabado Animado",
          small_image: "1335650238089793566/a2",
          small_text: "Online"
        },
        buttons: [
          { label: "Discord", url: "https://discord.gg/aR2nmn4ptU" }
        ]
      });
    } catch (error) {
      console.error('RPC Error:', error);
    }
  };

  // Atualize o RPC imediatamente e configure o intervalo
  updateRPC();
  const interval = setInterval(updateRPC, 15000); // Reduzi para 15 segundos para maior consistência

  // Retorne o interval para possível limpeza futura
  return interval;
};

// Adicione um listener para erros do client
client.on('error', error => {
  console.error('Client Error:', error);
});

client.once('ready', async () => {
  console.clear();
  
  // Tentar recuperar usuário salvo primeiro, depois usar o do client
  let currentUser = getCurrentUser();
  if (!currentUser && client.user?.username) {
    currentUser = client.user.username;
    setCurrentUser(currentUser);
  }
  
  // Garantir que sempre temos uma string válida
  loggedInUser = currentUser || client.user?.username || client.user?.tag || 'Usuário';
  const settings = loadAccountSettings(loggedInUser);
  
  // Configure o RPC antes de mostrar o menu
  await setupRPC(client);
  
  showMenu(rl, client, loggedInUser, settings);
});

loginClient(rl, client, (username) => {
  loggedInUser = username;
  setCurrentUser(username);
  const settings = loadAccountSettings(username);
  showMenu(rl, client, username, settings);
});
