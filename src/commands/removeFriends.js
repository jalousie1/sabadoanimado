const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');
const axios = require('axios');

const getFriends = async (client) => {
  try {
    const res = await axios.get('https://discord.com/api/v9/users/@me/relationships', {
      headers: {
        'Authorization': client.token,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return res.data.filter(user => user.type === 1); // Type 1 = Friend
  } catch (error) {
    console.log(colorful(colors.red, `     Erro ao buscar amigos: ${error}`));
    return [];
  }
};

const removeFriend = async (client, friendId) => {
  try {
    await axios.delete(`https://discord.com/api/v9/users/@me/relationships/${friendId}`, {
      headers: {
        'Authorization': client.token,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return true;
  } catch (error) {
    return false;
  }
};

const removeFriends = async (rl, client, settings, showMenu) => {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     Removendo amizades...'));

  const friends = await getFriends(client);
  const whitelistSet = new Set(settings.whitelist);
  let removed = 0;
  const total = friends.length;

  if (friends.length === 0) {
    console.log(colorful(colors.blue, '     Nenhum amigo encontrado.'));
    setTimeout(showMenu, 2000);
    return;
  }

  console.log(colorful(colors.blue, `     Total de amigos: ${total}`));

  for (const friend of friends) {
    if (whitelistSet.has(friend.id)) {
      console.log(colorful(colors.yellow, `     ${friend.user.username} na whitelist, pulando...`));
      continue;
    }

    try {
      if (await removeFriend(client, friend.id)) {
        removed++;
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(colorful(colors.green, 
          `     Amizades removidas: ${removed}/${total} (${friend.user.username})`
        ));
      } else {
        console.log(colorful(colors.red, `\n     Erro ao remover amizade com ${friend.user.username}`));
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit protection
    } catch (error) {
      console.log(colorful(colors.red, `\n     Erro ao processar ${friend.user.username}: ${error}`));
    }
  }

  console.log(colorful(colors.green, `\n     Concluído! ${removed} amizades removidas.`));
  setTimeout(showMenu, 3000);
};

module.exports = { removeFriends };
