const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');
const { saveSettings, loadAccountSettings } = require('../utils/settings');

const showAccountMenu = (rl, client, callback) => {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     Gerenciamento de Contas'));
  console.log("");
  console.log(colorful(colors.green, '     [1] Adicionar conta'));
  console.log(colorful(colors.green, '     [2] Remover conta'));
  console.log(colorful(colors.green, '     [3] Escolher conta'));
  console.log(colorful(colors.green, '     [0] Voltar'));
  console.log("");

  rl.question('     Escolha: ', (choice) => {
    switch (choice) {
      case '1': 
        addAccount(rl, client, () => showAccountMenu(rl, client, callback));
        break;
      case '2': 
        removeAccount(rl, client, () => showAccountMenu(rl, client, callback));
        break;
      case '3': 
        selectAccount(rl, client, () => showAccountMenu(rl, client, callback));
        break;
      case '0': 
        if (typeof callback === 'function') callback();
        break;
      default:
        console.log(colorful(colors.red, '     Opção inválida'));
        setTimeout(() => showAccountMenu(rl, client, callback), 2000);
    }
  });
};

const addAccount = (rl, client, callback) => {
  rl.question('     Token: ', async (token) => {
    try {
      await client.login(token);
      const username = client.user.username;
      const settings = loadAccountSettings(username);
      console.log(colorful(colors.green, '     Conta adicionada'));
      setTimeout(callback, 2000);
    } catch (err) {
      console.log(colorful(colors.red, '     Token inválido'));
      setTimeout(callback, 2000);
    }
  });
};

const removeAccount = (rl, client, callback) => {
  const settings = loadAccountSettings(client.user.username);
  
  if (!settings || !settings.accounts || settings.accounts.length === 0) {
    console.log(colorful(colors.red, '     Nenhuma conta cadastrada'));
    setTimeout(callback, 2000);
    return;
  }

  console.log('\n     Contas:');
  settings.accounts.forEach((acc, i) => {
    console.log(colorful(colors.green, `     [${i + 1}] ${acc.username}`));
  });

  rl.question('\n     Número da conta: ', (index) => {
    const i = parseInt(index) - 1;
    if (i >= 0 && i < settings.accounts.length) {
      const removedAccount = settings.accounts.splice(i, 1)[0];
      if (settings.currentAccount === i) {
        settings.currentAccount = null;
        settings.token = '';
      }
      saveSettings(settings);
      console.log(colorful(colors.green, `     ${removedAccount.username} removida`));
    } else {
      console.log(colorful(colors.red, '     Índice inválido'));
    }
    setTimeout(callback, 2000);
  });
};

const selectAccount = (rl, client, callback) => {
  const settings = loadAccountSettings(client.user.username);
  
  if (!settings || !settings.accounts || settings.accounts.length === 0) {
    console.log(colorful(colors.red, '     Nenhuma conta cadastrada'));
    setTimeout(callback, 2000);
    return;
  }

  console.log('\n     Contas:');
  settings.accounts.forEach((acc, i) => {
    console.log(colorful(colors.green, `     [${i + 1}] ${acc.username}`));
  });

  rl.question('\n     Número da conta: ', async (index) => {
    const i = parseInt(index) - 1;
    if (i >= 0 && i < settings.accounts.length) {
      const account = settings.accounts[i];
      
      // Clear client cache before switching
      client.channels.cache.clear();
      client.guilds.cache.clear();
      client.users.cache.clear();
      
      try {
        await client.login(account.token);
        
        // Load account specific settings
        const accountSettings = loadAccountSettings(account.username);
        settings.currentAccount = i;
        settings.token = account.token;
        settings.whitelist = accountSettings.whitelist;
        settings.whiteListServers = accountSettings.whiteListServers;
        settings.trigger = accountSettings.trigger;
        settings.stateRPC = accountSettings.stateRPC;
        
        saveSettings(settings);
        console.log(colorful(colors.green, `     Logado como ${account.username}`));
        setTimeout(() => callback(rl, client, settings, account.username), 2000);
      } catch (error) {
        console.log(colorful(colors.red, '     Erro ao fazer login'));
        settings.currentAccount = null;
        settings.token = '';
        saveSettings(settings);
        setTimeout(callback, 2000);
      }
    } else {
      console.log(colorful(colors.red, '     Índice inválido'));
      setTimeout(callback, 2000);
    }
  });
};

module.exports = { 
  showAccountMenu,
  addAccount,
  removeAccount,
  selectAccount
};
