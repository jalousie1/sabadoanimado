const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');
const { clearDm } = require('./clearDm');
const { closeDMs } = require('./closeDMs');
const { removeServers } = require('./removeServers');
const { clearDmFriends } = require('./clearDmFriends');
const { showWhitelistMenu } = require('./whitelist');
const { removeFriends } = require('./removeFriends');
const { exportChat } = require('./chatExport');
const { monitorUserVoice } = require('./monitorUserVoice');
const { showSelfbotMenu } = require('./selfbot');

const showMenu = (rl, client, loggedInUser, settings) => {
  console.clear();
  console.log(colorful(colors.blue, banner));
  
  let displayName = 'Usuário';
  
  if (typeof loggedInUser === 'string' && loggedInUser.length > 0) {
    displayName = loggedInUser;
  } else if (client?.user?.username) {
    displayName = client.user.username;
  } else if (client?.user?.tag) {
    displayName = client.user.tag;
  }
  
  console.log(colorful(colors.blue, `     [=] Bem-vindo, ${displayName}!`));
  console.log(colorful(colors.blue, '     [=] Escolha uma função:'));
  console.log("");
  console.log(colorful(colors.green, '     [1] Limpar DM.'));
  console.log(colorful(colors.green, '     [2] Limpar DM de Amigos.'));
  console.log(colorful(colors.green, '     [3] Remover Amizades.'));
  console.log(colorful(colors.green, '     [4] Remover Servidores.'));
  console.log(colorful(colors.green, '     [5] Fechar todas as DMs.'));
  console.log(colorful(colors.green, '     [6] Gerenciar Whitelist'));
  console.log(colorful(colors.green, '     [7] Exportar Chat'));
  console.log(colorful(colors.green, '     [8] Monitorar Usuário em Call (recomento botar token de alt)'));
  console.log(colorful(colors.green, '     [9] Selfbot'));
  console.log(colorful(colors.green, '     [0] Fechar.'));
  console.log("");

  rl.question('     [-] Escolha: ', (choice) => {
    const showMenuCallback = () => showMenu(rl, client, loggedInUser, settings);
    switch (choice) {
      case '1':
        clearDm(rl, client, settings, showMenuCallback);
        break;
      case '2':
        clearDmFriends(rl, client, settings, showMenuCallback);
        break;
      case '3':
        removeFriends(rl, client, settings, showMenuCallback);
        break;
      case '4':
        removeServers(rl, client, settings, showMenuCallback);
        break;
      case '5':
        closeDMs(rl, client, settings, showMenuCallback);
        break;
      case '6':
        showWhitelistMenu(rl, client, settings, showMenuCallback);
        break;
      case '7':
        exportChat(rl, client, showMenuCallback);
        break;
      case '8':
        monitorUserVoice(rl, client, settings, showMenuCallback);
        break;
      case '9':
        showSelfbotMenu(rl, client, settings, showMenuCallback);
        break;
      case '0':
        console.log('Saindo...');
        process.exit(0);
        break;
      default:
        console.log('Opção inválida!');
        setTimeout(showMenuCallback, 2000);
    }
  });
};

module.exports = { showMenu };
