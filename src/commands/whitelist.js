const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');
const { saveSettings, saveAccountSettings } = require('../utils/settings');

const showWhitelistMenu = (rl, client, settings, callback) => {
  // Initialize whitelist if it doesn't exist
  if (!settings.whitelist) {
    settings.whitelist = [];
  }

  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     Gerenciamento de Whitelist'));
  console.log("");
  console.log(colorful(colors.green, '     [1] Adicionar usuário à whitelist'));
  console.log(colorful(colors.green, '     [2] Remover usuário da whitelist'));
  console.log(colorful(colors.green, '     [3] Listar usuários na whitelist'));
  console.log(colorful(colors.green, '     [0] Voltar'));
  console.log("");

  rl.question('     Escolha: ', (choice) => {
    switch (choice) {
      case '1': addToWhitelist(rl, client, settings, () => showWhitelistMenu(rl, client, settings, callback), callback); break;
      case '2': removeFromWhitelist(rl, client, settings, () => showWhitelistMenu(rl, client, settings, callback), callback); break;
      case '3': listWhitelist(rl, client, settings, () => showWhitelistMenu(rl, client, settings, callback), callback); break;
      case '0': callback(); break;
      default:
        console.log(colorful(colors.red, '     Opção inválida'));
        setTimeout(() => showWhitelistMenu(rl, client, settings, callback), 2000);
    }
  });
};

const addToWhitelist = async (rl, client, settings, showWhitelistMenu, showMenu) => {
  if (!settings.whitelist) {
    settings.whitelist = [];
  }

  rl.question('     ID do usuário: ', async (userId) => {
    try {
      const user = await client.users.fetch(userId);
      if (!settings.whitelist.includes(userId)) {
        settings.whitelist.push(userId);
        saveSettings(settings);
        // Save to account specific settings
        const currentAccount = settings.accounts[settings.currentAccount];
        if (currentAccount) {
          saveAccountSettings(currentAccount.username, {
            whitelist: settings.whitelist,
            whiteListServers: settings.whiteListServers,
            trigger: settings.trigger,
            stateRPC: settings.stateRPC
          });
        }
        console.log(colorful(colors.green, `     ${user.username} adicionado à whitelist`));
      } else {
        console.log(colorful(colors.yellow, `     ${user.username} já está na whitelist`));
      }
    } catch (error) {
      console.log(colorful(colors.red, '     ID de usuário inválido'));
    }
    setTimeout(() => showWhitelistMenu(rl, client, settings, showMenu), 2000);
  });
};

const removeFromWhitelist = async (rl, client, settings, showWhitelistMenu, showMenu) => {
  if (!settings.whitelist) {
    settings.whitelist = [];
  }

  if (settings.whitelist.length === 0) {
    console.log(colorful(colors.yellow, '     Whitelist vazia'));
    setTimeout(() => showWhitelistMenu(rl, client, settings, showMenu), 2000);
    return;
  }

  console.log('\n     Usuários na whitelist:');
  for (let i = 0; i < settings.whitelist.length; i++) {
    try {
      const user = await client.users.fetch(settings.whitelist[i]);
      console.log(colorful(colors.green, `     [${i + 1}] ${user.username} (${user.id})`));
    } catch {
      console.log(colorful(colors.red, `     [${i + 1}] ID: ${settings.whitelist[i]} (Usuário não encontrado)`));
    }
  }

  rl.question('\n     Número do usuário para remover: ', (index) => {
    const i = parseInt(index) - 1;
    if (i >= 0 && i < settings.whitelist.length) {
      const removedId = settings.whitelist.splice(i, 1)[0];
      saveSettings(settings);
      // Save to account specific settings
      const currentAccount = settings.accounts[settings.currentAccount];
      if (currentAccount) {
        saveAccountSettings(currentAccount.username, {
          whitelist: settings.whitelist,
          whiteListServers: settings.whiteListServers,
          trigger: settings.trigger,
          stateRPC: settings.stateRPC
        });
      }
      console.log(colorful(colors.green, `     Usuário removido da whitelist`));
    } else {
      console.log(colorful(colors.red, '     Número inválido'));
    }
    setTimeout(() => showWhitelistMenu(rl, client, settings, showMenu), 2000);
  });
};

const listWhitelist = async (rl, client, settings, showWhitelistMenu, showMenu) => {
  if (!settings.whitelist) {
    settings.whitelist = [];
  }

  if (settings.whitelist.length === 0) {
    console.log(colorful(colors.yellow, '     Whitelist vazia'));
  } else {
    console.log('\n     Usuários na whitelist:');
    for (const userId of settings.whitelist) {
      try {
        const user = await client.users.fetch(userId);
        console.log(colorful(colors.green, `     • ${user.username} (${user.id})`));
      } catch {
        console.log(colorful(colors.red, `     • ID: ${userId} (Usuário não encontrado)`));
      }
    }
  }
  
  rl.question('\n     Pressione ENTER para voltar...', () => {
    showWhitelistMenu(rl, client, settings, showMenu);
  });
};

module.exports = { showWhitelistMenu };
