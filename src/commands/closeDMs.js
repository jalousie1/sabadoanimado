const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');

const closeDMs = async (rl, client, settings, showMenu) => {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     Fechando todas as DMs...'));

  const dms = client.channels.cache.filter(channel => channel.type === 'DM');
  const whitelistSet = new Set(settings.whitelist);
  const total = dms.size;
  let closed = 0;

  if (dms.size === 0) {
    console.log(colorful(colors.blue, '     Não há DMs abertas.'));
    setTimeout(showMenu, 2000);
    return;
  }

  for (const dm of dms.values()) {
    if (whitelistSet.has(dm.recipient?.id)) {
      console.log(colorful(colors.yellow, `     ${dm.recipient.username} na whitelist, pulando...`));
      continue;
    }

    try {
      await dm.delete();
      closed++;
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(colorful(colors.green, `     DMs fechadas: ${closed}/${total}`));
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit protection
    } catch (error) {
      console.log(colorful(colors.red, `\n     Erro ao fechar DM com ${dm.recipient.username}: ${error}`));
    }
  }

  console.log(colorful(colors.green, `\n     Concluído! ${closed} DMs fechadas.`));
  setTimeout(showMenu, 3000);
};

module.exports = { closeDMs };
