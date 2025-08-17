const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');

const clearDm = async (rl, client, settings, showMenuCallback) => {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     Limpar DM'));
  
  rl.question('     Coloque o ID: ', async (targetId) => {
    try {
      if (!targetId || !/^\d+$/.test(targetId)) {
        console.log(colorful(colors.red, '     Erro: ID inválido'));
        if (typeof showMenuCallback === 'function') {
          setTimeout(showMenuCallback, 2000);
        }
        return;
      }

      console.log(colorful(colors.blue, '     Buscando...'));

      let dmChannel;
      let targetName;
      
      try {
        // Primeiro tenta buscar como usuário
        const user = await client.users.fetch(targetId);
        if (user) {
          console.log(colorful(colors.green, `     Usuário: ${user.username}`));
          dmChannel = await user.createDM();
          targetName = user.username;
        }
      } catch (userError) {
        // Se não for usuário, tenta buscar como canal
        try {
          const channel = await client.channels.fetch(targetId);
          console.log(colorful(colors.yellow, `     Tipo do canal: ${channel.type}`));
          
          // Verifica se é um DM individual ou Group DM
          if (channel && (channel.type === 'DM' || channel.type === 'GROUP_DM')) {
            dmChannel = channel;
            
            if (channel.type === 'DM') {
              // DM individual
              targetName = channel.recipient?.username || 'DM Individual';
            } else if (channel.type === 'GROUP_DM') {
              // Group DM
              targetName = channel.name || `Grupo com ${channel.recipients?.length || 0} pessoas`;
            }
            
            console.log(colorful(colors.green, `     Canal: ${targetName}`));
            console.log(colorful(colors.yellow, `     Membros: ${channel.recipients?.length || 0}`));
          } else {
            console.log(colorful(colors.red, `     Erro: Canal não é uma DM válida. Tipo: ${channel?.type}`));
            if (typeof showMenuCallback === 'function') {
              setTimeout(showMenuCallback, 2000);
            }
            return;
          }
        } catch (channelError) {
          console.log(colorful(colors.red, `     Erro: ${channelError.message}`));
          if (typeof showMenuCallback === 'function') {
            setTimeout(showMenuCallback, 2000);
          }
          return;
        }
      }

      console.log(colorful(colors.blue, '     Iniciando...'));
      
      let totalDeleted = 0;
      let running = true;
      let lastId = null;
      const concurrentLimit = 8;
      const batchDelayMs = 20;

      const exitHandler = () => {
        if (running) {
          running = false;
          console.log(colorful(colors.yellow, '\n     Interrompendo...'));
        }
      };
      process.on('SIGINT', exitHandler);

      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      const deleteMessagesBatch = async (messages) => {
        const deletePromises = messages.map(async (message) => {
          try {
            await message.delete();
            return true;
          } catch (error) {
            if (error.code === 10008) return true; // Message already deleted
            if (error.code === 429) throw error; // Rate limit
            if (error.code === 50001) {
              console.log(colorful(colors.red, `     Sem permissão para deletar mensagem`));
              return false;
            }
            console.log(colorful(colors.red, `     Erro ao deletar: ${error.message}`));
            return false;
          }
        });

        const results = await Promise.allSettled(deletePromises);
        return results.filter(r => r.status === 'fulfilled' && r.value).length;
      };

      while (running) {
        try {
          const fetchOptions = { limit: 100, cache: false };
          if (lastId) fetchOptions.before = lastId;

          const fetchedMessages = await dmChannel.messages.fetch(fetchOptions);
          
          if (!running || fetchedMessages.size === 0) break;

          lastId = fetchedMessages.last().id;
          const messagesToDelete = Array.from(fetchedMessages.values())
            .filter(msg => msg.author.id === client.user.id && !msg.system);

          console.log(colorful(colors.yellow, `     Encontradas ${fetchedMessages.size} mensagens, ${messagesToDelete.length} são suas`));

          if (messagesToDelete.length === 0) {
            if (fetchedMessages.size < 100) break;
            await sleep(batchDelayMs);
            continue;
          }

          for (let i = 0; i < messagesToDelete.length; i += concurrentLimit) {
            if (!running) break;
            
            const chunk = messagesToDelete.slice(i, i + concurrentLimit);
            const deleted = await deleteMessagesBatch(chunk);
            totalDeleted += deleted;

            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(colorful(colors.green, `     ${totalDeleted} deletadas`));

            if (i + concurrentLimit < messagesToDelete.length) {
              await sleep(batchDelayMs);
            }
          }

          await sleep(batchDelayMs);

        } catch (error) {
          if (!running) break;
          
          if (error.code === 429) {
            const waitTime = error.retry_after ? (error.retry_after * 1000 + 1000) : 5000;
            console.log(colorful(colors.yellow, `\n     Rate limited. Aguardando ${Math.ceil(waitTime/1000)}s...`));
            await sleep(waitTime);
          } else {
            console.log(colorful(colors.red, `\n     Erro: ${error.message}`));
            await sleep(3000);
          }
        }
      }

      process.removeListener('SIGINT', exitHandler);
      
      if (running) {
        console.log(colorful(colors.green, `\n\n     Terminado! ${totalDeleted} mensagens deletadas`));
      } else {
        console.log(colorful(colors.yellow, `\n\n     Interrompido. ${totalDeleted} mensagens deletadas`));
      }
      
      if (typeof showMenuCallback === 'function') {
        setTimeout(showMenuCallback, 3000);
      }
      
    } catch (error) {
      console.log(colorful(colors.red, `     Erro: ${error.message}`));
      if (typeof showMenuCallback === 'function') {
        setTimeout(showMenuCallback, 3000);
      }
    }
  });
};

module.exports = { clearDm };
