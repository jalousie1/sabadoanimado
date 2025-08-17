const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Path to the configuration file
const CONFIG_FILE_PATH = path.join(__dirname, '../utils/webhook_users.json');

let monitoredUserId = null;
let monitoredUserTag = null; // To store the tag for user-friendly messages
let notificationWebhookUrl = null;
let voiceStateListener = null;
let localClient = null;

// Load monitoring configuration from JSON file
function loadVoiceMonitorConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch (error) {
    console.log(colorful(colors.red, '     [x] Erro ao carregar configuração de monitoramento: ' + error.message));
  }
  return { webhookUrl: null, monitoredUserId: null, monitoredUserTag: null }; // Default if no file or error
}

// Save monitoring configuration to JSON file
function saveVoiceMonitorConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.log(colorful(colors.red, '     [x] Erro ao salvar configuração de monitoramento: ' + error.message));
  }
}

async function sendVoiceNotification(embedData) {
  if (!notificationWebhookUrl) return;
  try {
    await axios.post(notificationWebhookUrl, {
      username: `${localClient?.user?.username || ''}`,
      avatar_url: localClient?.user?.displayAvatarURL(),
      embeds: [embedData],
    });
  } catch (error) {
    console.log(colorful(colors.red, '     [x] Erro ao enviar notificação para o webhook:'));
    if (error.response) {
      console.log(colorful(colors.red, `     [!] Status: ${error.response.status}`));
      console.log(colorful(colors.red, `     [!] Resposta: ${JSON.stringify(error.response.data)}`));
    } else {
      console.log(colorful(colors.red, `     [!] ${error.message}`));
    }
  }
}

const handleVoiceStateUpdate = (oldState, newState) => {
  // Ensure the currently monitored user ID from the active session is used
  if (!monitoredUserId || newState.id !== monitoredUserId) {
    return;
  }

  const user = newState.member?.user || oldState.member?.user;
  if (!user) return;

  if (newState.channelId && newState.channel) {
    if (oldState.channelId !== newState.channelId) { 
      const membersInCall = newState.channel.members.map(m => m.user.username);
      let membersInCallText = 'Ninguém (além do usuário).';
      if (membersInCall.length > 0) {
        membersInCallText = membersInCall.slice(0, 8).join(', ');
        if (membersInCall.length > 8) {
          membersInCallText += ', ...';
        }
      }
      const callLink = `https://discord.com/channels/${newState.guild.id}/${newState.channel.id}`;
      const embed = {
        color: 0x392ec9,
        title: 'Usuário Entrou/Mudou de Canal de Voz',
        description: `**${user.tag}** entrou em **${newState.channel.name}** no servidor **${newState.guild.name}**.`,        
        fields: [
          { name: 'Pessoas na VC', value: '```' + membersInCallText + '```', inline: false },
          { name: 'Link para a Call', value: `[Ir para o canal](${callLink})`, inline: false },
        ],
        footer: { text: `ID do Usuário: ${user.id} | Monitorado por: ${localClient?.user?.username || ''}` },
        timestamp: new Date().toISOString(),
      };
      sendVoiceNotification(embed);
    }
  } 
  else if (oldState.channelId && !newState.channelId) {
    const embed = {
      color: 0x392ec9,
      title: 'Usuário Saiu do Canal de Voz',
      description: `**${user.tag}** saiu do canal de voz **${oldState.channel.name}** no servidor **${oldState.guild.name}**.`, // user.tag aqui pode ser o monitoredUserTag
      fields: [
        { name: 'Servidor', value: '```' + oldState.guild.name + '```', inline: true },
        { name: 'Canal de Voz (Anterior)', value: '```' + oldState.channel.name + '```', inline: true },
      ],
      footer: { text: `ID do Usuário: ${user.id} | Monitorado por: ${localClient?.user?.username || ''}` },
      timestamp: new Date().toISOString(),
    };
    sendVoiceNotification(embed);
  }
};


const monitorUserVoice = async (rl, client, settings, showMenuCallback) => {
  localClient = client;
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     [x] Monitorar Atividade de Voz do Usuário'));

  const config = loadVoiceMonitorConfig();

  const startNewMonitor = async () => {
    if (voiceStateListener) {
      client.removeListener('voiceStateUpdate', voiceStateListener);
      voiceStateListener = null;
      monitoredUserId = null;
      monitoredUserTag = null; // Limpa o tag também
      notificationWebhookUrl = null;
      console.log(colorful(colors.yellow, '     [!] Monitoramento anterior (da sessão atual) interrompido.'));
    }

    rl.question(colorful(colors.cyan, '     [-] Digite o ID do usuário a ser monitorado: '), async (userIdInput) => {
      const tempUserId = userIdInput.trim();
      if (!/^\d+$/.test(tempUserId)) {
        console.log(colorful(colors.red, '     [x] ID de usuário inválido.'));
        return setTimeout(showMenuCallback, 2000);
      }

      let targetUser;
      try {
        targetUser = await client.users.fetch(tempUserId);
        if (!targetUser) throw new Error('Usuário não encontrado');
      } catch {
        console.log(colorful(colors.red, '     [x] Usuário não encontrado com o ID fornecido.'));
        return setTimeout(showMenuCallback, 2000);
      }

      const askForWebhook = () => {
        rl.question(colorful(colors.cyan, '     [-] URL do Webhook para notificações: '), async (webhookUrlInput) => {
          if (!webhookUrlInput.startsWith('https://discord.com/api/webhooks/')) {
            console.log(colorful(colors.red, '     [x] URL de Webhook inválida.'));
            return setTimeout(showMenuCallback, 2000);
          }
          // Salva as variáveis globais da sessão e no JSON
          monitoredUserId = tempUserId;
          monitoredUserTag = targetUser.tag; 
          notificationWebhookUrl = webhookUrlInput;
          saveVoiceMonitorConfig({ webhookUrl: notificationWebhookUrl, monitoredUserId: monitoredUserId, monitoredUserTag: monitoredUserTag });
          
          if (!voiceStateListener) {
            voiceStateListener = handleVoiceStateUpdate;
            client.on('voiceStateUpdate', voiceStateListener);
          }
          console.log(colorful(colors.green, `     [✓] Monitoramento iniciado para ${targetUser.tag} (${monitoredUserId}).`));
          setTimeout(showMenuCallback, 3000);
        });
      };

      // Se um webhook já existe no settings (app geral) ou no config (deste comando), pergunta se quer usar
      // Dando prioridade ao config específico do monitoramento.
      const webhookToConsider = config.webhookUrl || settings.monitorWebhook; 

      if (webhookToConsider) {
        console.log(colorful(colors.yellow, `     [!] Webhook encontrado: ${webhookToConsider.substring(0,50)}...`));
        rl.question(colorful(colors.cyan, '     [?] Usar este webhook? (s/n, padrão: s): '), async (useExisting) => {
          if (useExisting.toLowerCase() === 'n') {
            askForWebhook();
          } else {
            monitoredUserId = tempUserId;
            monitoredUserTag = targetUser.tag;
            notificationWebhookUrl = webhookToConsider;
            saveVoiceMonitorConfig({ webhookUrl: notificationWebhookUrl, monitoredUserId: monitoredUserId, monitoredUserTag: monitoredUserTag });
            
            if (!voiceStateListener) {
                voiceStateListener = handleVoiceStateUpdate;
                client.on('voiceStateUpdate', voiceStateListener);
            }
            console.log(colorful(colors.green, `     [✓] Monitoramento iniciado para ${targetUser.tag} (${monitoredUserId}) usando webhook existente.`));
            setTimeout(showMenuCallback, 3000);
          }
        });
      } else {
        askForWebhook();
      }
    });
  };

  if (config.monitoredUserId && config.webhookUrl) {
    console.log(colorful(colors.yellow, `     [!] Configuração salva encontrada: Monitorando ${config.monitoredUserTag || config.monitoredUserId} com webhook ${config.webhookUrl.substring(0,50)}...`));
    // Verifica se este monitoramento já está ativo na sessão atual
    if (monitoredUserId === config.monitoredUserId && notificationWebhookUrl === config.webhookUrl && voiceStateListener) {
        console.log(colorful(colors.green, '     [=] Este monitoramento já está ativo nesta sessão.'));
        rl.question(colorful(colors.cyan, '     [?] Deseja interromper e configurar um novo? (s/n, padrão: n): '), (choice) => {
            if (choice.toLowerCase() === 's') {
                startNewMonitor();
            } else {
                setTimeout(showMenuCallback, 2000);
            }
        });
    } else {
        rl.question(colorful(colors.cyan, '     [?] Deseja ativar este monitoramento salvo? (s/n, padrão: s): '), async (choice) => {
            if (choice.toLowerCase() === 'n') {
                rl.question(colorful(colors.cyan, '     [?] Configurar um novo monitoramento? (s/n, padrão: s): '), (newChoice) => {
                    if (newChoice.toLowerCase() !== 'n') {
                        startNewMonitor();
                    } else {
                        setTimeout(showMenuCallback, 2000);
                    }
                });
            } else {
                // Ativa o monitoramento salvo
                if (voiceStateListener) { // Limpa qualquer listener de sessão anterior se houver
                    client.removeListener('voiceStateUpdate', voiceStateListener);
                }
                monitoredUserId = config.monitoredUserId;
                monitoredUserTag = config.monitoredUserTag;
                notificationWebhookUrl = config.webhookUrl;
                voiceStateListener = handleVoiceStateUpdate;
                client.on('voiceStateUpdate', voiceStateListener);
                console.log(colorful(colors.green, `     [✓] Monitoramento ATIVADO para ${monitoredUserTag || monitoredUserId} usando configuração salva.`));
                setTimeout(showMenuCallback, 3000);
            }
        });
    }
  } else {
    startNewMonitor();
  }
};

module.exports = { monitorUserVoice }; 