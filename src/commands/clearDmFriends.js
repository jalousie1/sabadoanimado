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

const clearDmFriends = async (rl, client, settings, showMenu) => {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     Limpando DMs de Amigos...'));

  const friends = await getFriends(client);
  const whitelistSet = new Set(settings.whitelist);
  let totalDeletedOverall = 0;
  let processedFriends = 0;
  let running = true;

  let currentDelayMs = 300;
  const minDelayMs = 200;
  const maxDelayMs = 7000;
  const successStreakToReduceDelay = 15;
  const errorThresholdToIncreaseDelay = 3;
  const maxDeleteAttemptsPerMessage = 3;

  const initialFastDeleteTarget = 40;
  const initialFastDelayMs = 175;
  let turboModeActive = true;
  let messagesDeletedInTurbo = 0;

  let consecutiveSuccesses = 0;
  let consecutiveErrors = 0;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  if (friends.length === 0) {
    console.log(colorful(colors.blue, '     Nenhum amigo encontrado.'));
    setTimeout(showMenu, 2000);
    return;
  }

  for (const friend of friends) {
    if (whitelistSet.has(friend.id)) {
      console.log(colorful(colors.yellow, `     ${friend.user.username} na whitelist, pulando...`));
      processedFriends++;
      continue;
    }

    try {
      const dm = await client.users.cache.get(friend.id)?.createDM();
      if (!dm) continue;

      let lastId = null;
      let messagesDeletedForThisFriend = 0;

      console.log(colorful(colors.blue, `     Iniciando ${friend.user.username}...`));

      fetchLoop: while (running) { 
        try {
          const messagesToFetch = 100;
          const fetchOptions = {
            limit: messagesToFetch,
            cache: false,
          };
          if (lastId) {
            fetchOptions.before = lastId;
          }
          
          const messages = await dm.messages.fetch(fetchOptions);

          if (!running) break fetchLoop;
          if (messages.size === 0) break fetchLoop;
          
          lastId = messages.last().id;

          const messagesToDelete = Array.from(messages.values())
            .filter(msg => msg.author.id === client.user.id && !msg.system);

          if (messagesToDelete.length === 0 && messages.size < messagesToFetch) {
              break fetchLoop;
          }
          if (messagesToDelete.length === 0) {
              continue;
          }

          for (const message of messagesToDelete) {
            if (!running) break fetchLoop;

            let deletedSuccessfully = false;
            let attempts = 0;

            deleteAttemptLoop: while (attempts < maxDeleteAttemptsPerMessage && !deletedSuccessfully && running) {
              attempts++;
              try {
                await message.delete();
                deletedSuccessfully = true;
                messagesDeletedForThisFriend++;
                totalDeletedOverall++;
                if (turboModeActive && messagesDeletedInTurbo < initialFastDeleteTarget) {
                  messagesDeletedInTurbo++;
                }
                consecutiveSuccesses++;
                consecutiveErrors = 0;

                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(colorful(colors.green, 
                  `     ${friend.user.username}: ${messagesDeletedForThisFriend} (Total: ${totalDeletedOverall})`
                ));

                if (consecutiveSuccesses >= successStreakToReduceDelay && !(turboModeActive && messagesDeletedInTurbo < initialFastDeleteTarget)) {
                  currentDelayMs = Math.max(minDelayMs, Math.floor(currentDelayMs * 0.90));
                  consecutiveSuccesses = 0;
                }
              } catch (error) {
                consecutiveSuccesses = 0;

                if (error.code === 10008) {
                  deletedSuccessfully = true;
                  break deleteAttemptLoop;
                } else if (error.code === 429 || error.httpStatus === 429) {
                  const retryAfter = error.retry_after || error.data?.retry_after || 5;
                  const waitMs = (retryAfter * 1000) + 500;
                  
                  if (turboModeActive) {
                    turboModeActive = false;
                  }
                  currentDelayMs = Math.min(maxDelayMs, Math.floor(currentDelayMs * 1.2) + 200);
                  
                  process.stdout.clearLine(0);
                  process.stdout.cursorTo(0);
                  console.log(colorful(colors.yellow, 
                    `\n     Rate limit em ${friend.user.username}! Esperando ${retryAfter.toFixed(1)}s.`
                  ));
                  await sleep(waitMs);
                  if (!running) break deleteAttemptLoop;
                  attempts--; 
                  continue;
                } else {
                  consecutiveErrors++;
                  console.log(colorful(colors.red, `\n     Erro ao deletar msg ${message.id} para ${friend.user.username} (Tentativa ${attempts}/${maxDeleteAttemptsPerMessage}): ${error.message}`));
                  
                  if (consecutiveErrors >= errorThresholdToIncreaseDelay) {
                    currentDelayMs = Math.min(maxDelayMs, Math.floor(currentDelayMs * 1.5) + 100);
                    consecutiveErrors = 0;
                    console.log(colorful(colors.yellow, `\n     Múltiplos erros. Delay aumentado para ${currentDelayMs}ms`));
                  }

                  if (attempts >= maxDeleteAttemptsPerMessage) {
                    console.log(colorful(colors.red, `\n     Falha ao deletar msg ${message.id} para ${friend.user.username} após ${maxDeleteAttemptsPerMessage} tentativas.`));
                    break deleteAttemptLoop; 
                  }
                  await sleep(Math.min(maxDelayMs, currentDelayMs * attempts));
                }
              }
            }

            if (!running) break fetchLoop;
            if (deletedSuccessfully) {
              let delayToUse = currentDelayMs;
              if (turboModeActive && messagesDeletedInTurbo < initialFastDeleteTarget) {
                  delayToUse = initialFastDelayMs;
              } else if (turboModeActive && messagesDeletedInTurbo >= initialFastDeleteTarget) {
                  turboModeActive = false;
                  messagesDeletedInTurbo = initialFastDeleteTarget;
              }
              await sleep(delayToUse);
            }
          }
        } catch (fetchError) {
            if (!running) break fetchLoop;
            console.log(colorful(colors.red, `\n     Erro ao buscar mensagens para ${friend.user.username}: ${fetchError.message || fetchError}`));
            if (fetchError.code === 429 || fetchError.httpStatus === 429) {
                const retryAfter = fetchError.retry_after || fetchError.data?.retry_after || 10;
                const waitMs = (retryAfter * 1000) + 500;
                console.log(colorful(colors.yellow, `\n     Rate limit ao buscar. Esperando ${retryAfter.toFixed(1)}s...`));
                await sleep(waitMs);
            } else {
                await sleep(2000);
            }
            break fetchLoop;
        }
      }

      processedFriends++;
      if (messagesDeletedForThisFriend > 0) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.log(colorful(colors.green, 
          `     ${friend.user.username}: ${messagesDeletedForThisFriend} mensagens deletadas.`
        ));
      } else {
        console.log(colorful(colors.blue, `     Nenhuma mensagem para deletar na DM com ${friend.user.username}.`));
      }

      if (running && !whitelistSet.has(friend.id)) {
        try {
          console.log(colorful(colors.yellow, `     Removendo amigo: ${friend.user.username}...`));
          await axios.delete(`https://discord.com/api/v9/users/@me/relationships/${friend.id}`, {
            headers: {
              'Authorization': client.token,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            data: { type: 1 }
          });
          console.log(colorful(colors.green, `     ${friend.user.username} removido.`));
          await sleep(currentDelayMs);
        } catch (removeError) {
          console.log(colorful(colors.red, `     Erro ao remover ${friend.user.username}: ${removeError.message}`));
          if (removeError.response && removeError.response.data) {
            console.log(colorful(colors.red, `     Detalhes: ${JSON.stringify(removeError.response.data)}`));
          }
          await sleep(currentDelayMs);
        }
      }

    } catch (error) {
      console.log(colorful(colors.red, `\n     Erro ao processar DM de ${friend.user.username}: ${error.message || error}`));
      await sleep(1000);
    }
    if (!running) break;
  }

  console.log(colorful(colors.green, 
    `\n     Concluído! ${totalDeletedOverall} mensagens deletadas de ${processedFriends} amigos.`
  ));
  setTimeout(showMenu, 3000);
};

module.exports = { clearDmFriends };
