const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');

const removeServers = async (rl, client, settings, showMenu) => {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     Removendo Servidores...'));

  const servers = client.guilds.cache;
  const whitelistSet = new Set(settings.whiteListServers);
  const total = servers.size;
  let removed = 0;

  if (servers.size === 0) {
    console.log(colorful(colors.blue, '     Você não está em nenhum servidor.'));
    setTimeout(showMenu, 2000);
    return;
  }

  console.log(colorful(colors.blue, `     Iniciando remoção de ${total} servidores...`));

  for (const [, server] of servers) {
    if (whitelistSet.has(server.id)) {
      console.log(colorful(colors.yellow, `     ${server.name} na whitelist, pulando...`));
      continue;
    }

    try {
      await server.leave();
      removed++;
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(colorful(colors.green, `     Servidores removidos: ${removed}/${total}`));
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit protection
    } catch (error) {
      console.log(colorful(colors.red, `\n     Erro ao sair do servidor ${server.name}: ${error}`));
    }
  }

  console.log(colorful(colors.green, `\n     Concluído! Saiu de ${removed} servidores.`));
  setTimeout(showMenu, 3000);
};

module.exports = { removeServers };
