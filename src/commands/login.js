const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');
const { saveAccount, loadAccounts, updateLastUsed } = require('../utils/accountManager');
const { loadAccountSettings } = require('../utils/settings');

const addAccount = async (rl, client, showMenu) => {
  try {
    const token = client.token;
    await client.login(token);
    const username = client.user.username;
    
    // Save account to file
    saveAccount(username, token);
    console.log(colorful(colors.green, '     Conta adicionada'));
    return true;
  } catch (err) {
    console.log(colorful(colors.red, '     Token inválido'));
    return false;
  }
};

const selectAccount = (rl, client, showMenu) => {
  const accounts = loadAccounts();
  
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '\n     Seleção de Contas'));
  console.log(colorful(colors.blue, '     ──────────────────────'));
  
  // Lista de contas
  for (let i = 0; i < accounts.length; i++) {
    console.log(colorful(colors.green, `     [${i + 1}] ${accounts[i].username}`));
  }
  
  console.log(colorful(colors.blue, '     ──────────────────────'));
  console.log(colorful(colors.yellow, '     [0] Adicionar nova conta\n'));

  rl.question('     Escolha: ', async (index) => {
    if (index === '0') {
      console.log(colorful(colors.blue, '     Adicionando nova conta...'));
      rl.question('     Token: ', async (token) => {
        client.token = token;
        if (await addAccount(rl, client, showMenu)) {
          showMenu(rl, client, client.user.username, loadAccountSettings(client.user.username));
        } else {
          setTimeout(() => selectAccount(rl, client, showMenu), 2000);
        }
      });
      return;
    }

    const i = parseInt(index) - 1;
    if (i >= 0 && i < accounts.length) {
      const account = accounts[i];
      
      client.login(account.token).then(() => {
        updateLastUsed(account.username);
        setTimeout(() => showMenu(rl, client, account.username, loadAccountSettings(account.username)), 100);
      }).catch(() => {
        console.log(colorful(colors.red, '     Erro ao fazer login'));
        setTimeout(() => selectAccount(rl, client, showMenu), 2000);
      });
    } else {
      console.log(colorful(colors.red, '     Opção inválida'));
      setTimeout(() => selectAccount(rl, client, showMenu), 2000);
    }
  });
};

const loginClient = (rl, client, showMenu) => {
  const accounts = loadAccounts();
  
  if (accounts.length === 0) {
    console.clear();
    console.log(colorful(colors.blue, banner));
    console.log(colorful(colors.blue, '     Nenhuma conta encontrada. Adicione uma conta.'));
    rl.question('     Token: ', async (token) => {
      client.token = token;
      if (await addAccount(rl, client, showMenu)) {
        showMenu(rl, client, client.user.username, loadAccountSettings(client.user.username));
      } else {
        setTimeout(() => loginClient(rl, client, showMenu), 2000);
      }
    });
  } else {
    selectAccount(rl, client, showMenu);
  }
};

module.exports = { loginClient, addAccount, selectAccount };
