const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');
const axios = require('axios');

// Função auxiliar para solicitar o webhook e continuar
async function promptForWebhook(rl, client, settings, userId, showMenuCallback) {
  rl.question(colorful(colors.cyan, '     URL do Webhook: '), async (webhookUrlInput) => {
    if (!webhookUrlInput.startsWith('https://discord.com/api/webhooks/')) {
      console.log(colorful(colors.red, '     URL de Webhook inválida. Deve começar com https://discord.com/api/webhooks/'));
      return setTimeout(showMenuCallback, 2000);
    }

    rl.question(colorful(colors.cyan, '     Salvar este webhook? (s/n, padrão: s): '), async (saveWebhookChoice) => {
      const save = saveWebhookChoice.toLowerCase() !== 'n';
      if (save) {
        settings.userInfoWebhook = webhookUrlInput; // Salva no objeto settings em memória
        // Nota: A persistência real em settings.json deve ser tratada pelo script principal.
        console.log(colorful(colors.green, '     Webhook salvo para esta sessão.'));
      }
      await fetchAndSendUserInfo(client, userId, webhookUrlInput, settings, showMenuCallback, false, save);
    });
  });
}

// Função principal para buscar e enviar as informações
async function fetchAndSendUserInfo(client, userId, webhookUrl, settings, showMenuCallback, wasExistingWebhook = false, didSaveWebhook = false) {
  try {
    console.log(colorful(colors.blue, '     Buscando informações do usuário...'));
    // Fetch user com force: true para tentar obter o banner
    const user = await client.users.fetch(userId, { force: true }).catch(() => null);

    if (!user) {
      console.log(colorful(colors.red, '     Usuário não encontrado com o ID fornecido.'));
      return setTimeout(showMenuCallback, 3000);
    }

    const mutualGuilds = client.guilds.cache.filter(guild => guild.members.cache.has(user.id)).map(guild => guild.name);

    const embed = {
      color: 0x0099ff,
      title: `Informações de ${user.tag}${user.globalName ? ` (Exibição: ${user.globalName})` : ''}`,
      thumbnail: { url: user.displayAvatarURL({ dynamic: true, size: 256 }) },
      fields: [
        { name: 'Nome de Usuário', value: '```' + user.username + '```', inline: true },
        { name: 'Tag', value: '```#' + user.discriminator + '```', inline: true },
        { name: 'ID', value: '```' + user.id + '```', inline: true },
        { name: 'Conta Criada em', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`, inline: false },
        { name: 'Avatar URL', value: `[Link Direto](${user.displayAvatarURL({ dynamic: true, size: 1024 })})`, inline: true },
      ],
      footer: { text: `Solicitado via: ${client.user.tag}`, icon_url: client.user.displayAvatarURL() },
      timestamp: new Date().toISOString(),
    };
    
    if (user.globalName && user.globalName !== user.username) {
        embed.fields.splice(1, 0, { name: 'Nome de Exibição Global', value: '```' + user.globalName + '```', inline: true });
    }
    
    if (user.banner) {
      embed.image = { url: user.bannerURL({ dynamic: true, size: 512 }) };
      embed.fields.push({ name: 'Banner URL', value: `[Link Direto](${user.bannerURL({ dynamic: true, size: 1024 })})`, inline: true });
    } else {
      embed.fields.push({ name: 'Banner', value: 'Nenhum', inline: true });
    }

    if (mutualGuilds.length > 0) {
      const guildsList = mutualGuilds.slice(0, 10).join('\n'); // Limita para não estourar o embed
      embed.fields.push({ name: `Servidores em Comum (${mutualGuilds.length})`, value: '```\n' + guildsList + (mutualGuilds.length > 10 ? '\nE mais...' : '') + '\n```', inline: false });
    } else {
      embed.fields.push({ name: 'Servidores em Comum', value: 'Nenhum', inline: false });
    }

    // Informações da Call (Canal de Voz)
    let inCall = false;
    for (const guild of client.guilds.cache.values()) {
      if (guild.members.cache.has(user.id)) {
        const member = guild.members.cache.get(user.id);
        if (member && member.voice && member.voice.channel) {
          inCall = true;
          const voiceChannel = member.voice.channel;
          const membersInCall = voiceChannel.members.map(m => m.user.username);
          
          embed.fields.push({ 
            name: 'Em Call no Servidor', 
            value: '```' + guild.name + '```', 
            inline: false 
          });
          embed.fields.push({ 
            name: 'Canal de Voz', 
            value: '```' + voiceChannel.name + '```', 
            inline: true 
          });
          embed.fields.push({ 
            name: `Membros na Call (${membersInCall.length})`,
            value: '```' + (membersInCall.slice(0, 5).join(', ') + (membersInCall.length > 5 ? ', ...' : '')) + '```', 
            inline: true 
          });
          break; // Encontrou o usuário em uma call, não precisa verificar outros servidores
        }
      }
    }
    if (!inCall) {
      embed.fields.push({ name: 'Status da Call', value: 'Não está em um canal de voz (visível para o bot)', inline: false });
    }

    console.log(colorful(colors.blue, '     Enviando informações para o webhook...'));
    await axios.post(webhookUrl, {
      username: `${client.user.username}`,
      avatar_url: client.user.displayAvatarURL(),
      embeds: [embed],
    });

    let successMessage = '     Enviadas para o webhook com sucesso!';
    if (!wasExistingWebhook && didSaveWebhook) {
        successMessage += ' Webhook salvo para uso futuro.';
    } else if (!wasExistingWebhook && !didSaveWebhook) {
        successMessage += ' Webhook não foi salvo.';
    }

    console.log(colorful(colors.green, successMessage));

  } catch (error) {
    console.log(colorful(colors.red, '     Erro ao buscar ou enviar informações do usuário:'));
    if (error.response) { // Erro do Axios (ex: webhook inválido, rate limit do Discord)
      console.log(colorful(colors.red, `     Status: ${error.response.status}`));
      console.log(colorful(colors.red, `     Resposta: ${JSON.stringify(error.response.data)}`));
    } else { // Outros erros (ex: user not found se o catch do fetch falhar, etc.)
      console.log(colorful(colors.red, `     ${error.message}`));
    }
  } finally {
    setTimeout(showMenuCallback, 4000);
  }
}

const viewAccountInfo = async (rl, client, settings, showMenuCallback) => {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     Ver Informações da Conta de Usuário'));

  rl.question(colorful(colors.cyan, '     ID do usuário: '), async (userIdInput) => {
    const userId = userIdInput.trim();
    if (!/^\d+$/.test(userId)) {
      console.log(colorful(colors.red, '     ID de usuário inválido. Deve conter apenas números.'));
      return setTimeout(showMenuCallback, 2000);
    }

    const existingWebhook = settings.userInfoWebhook;

    if (existingWebhook) {
      console.log(colorful(colors.yellow, `     Webhook já configurado: ${existingWebhook.substring(0,50)}...`));
      rl.question(colorful(colors.cyan, '     Usar este webhook salvo? (s/n, padrão: s): '), async (useExistingChoice) => {
        if (useExistingChoice.toLowerCase() === 'n') {
          await promptForWebhook(rl, client, settings, userId, showMenuCallback);
        } else {
          await fetchAndSendUserInfo(client, userId, existingWebhook, settings, showMenuCallback, true);
        }
      });
    } else {
      await promptForWebhook(rl, client, settings, userId, showMenuCallback);
    }
  });
};

module.exports = { viewAccountInfo }; 