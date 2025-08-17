const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const downloadAttachment = async (url, folderPath, fileName) => {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(path.join(folderPath, fileName));
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.log(colorful(colors.red, `     Erro ao baixar ${fileName}`));
  }
};

const formatMessage = (msg) => {
  const date = new Date(msg.timestamp).toLocaleString();
  let formatted = `[${date}] ${msg.author}: ${msg.content}\n`;
  
  if (msg.attachments.length > 0) {
    formatted += `Arquivos anexados: ${msg.attachments.join(', ')}\n`;
  }
  
  return formatted;
};

const exportChat = async (rl, client, callback) => {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     Chat Exporter'));
  console.log(colorful(colors.green, '     Use ID de usuário ou canal'));

  rl.question('     ID: ', async (id) => {
    try {
      let channel;
      let chatName;

      // Try to fetch as user first, then as channel
      try {
        const user = await client.users.fetch(id);
        channel = await user.createDM();
        chatName = user.username;
      } catch {
        channel = await client.channels.fetch(id);
        chatName = channel.name;
      }

      if (!channel) {
        console.log(colorful(colors.red, '     ID inválido'));
        setTimeout(callback, 2000);
        return;
      }

      // Create chat-specific directory
      const chatDir = path.join(__dirname, '../../exports', chatName);
      const attachmentsDir = path.join(chatDir, 'attachments');
      fs.mkdirSync(chatDir, { recursive: true });
      fs.mkdirSync(attachmentsDir, { recursive: true });

      console.log(colorful(colors.blue, `     Exportando ${chatName}...`));
      let messages = [];
      let lastId = null;
      let messagesFound = 0;
      let attachmentsFound = 0;

      while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const fetched = await channel.messages.fetch(options);
        if (fetched.size === 0) break;

        for (const msg of fetched.values()) {
          messages.push({
            author: msg.author.tag,
            content: msg.content || "[Sem conteúdo]",
            timestamp: msg.createdAt.toISOString(),
            attachments: msg.attachments.map(att => att.name)
          });

          // Download attachments
          for (const attachment of msg.attachments.values()) {
            attachmentsFound++;
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(colorful(colors.yellow, 
              `     Baixando: ${attachment.name}`
            ));
            
            await downloadAttachment(
              attachment.url, 
              attachmentsDir, 
              `${Date.now()}-${attachment.name}`
            );
          }
        }

        lastId = fetched.last().id;
        messagesFound += fetched.size;

        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(colorful(colors.green, 
          `     Mensagens: ${messagesFound} | Anexos: ${attachmentsFound}`
        ));

        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit protection
      }

      // Save messages to txt file
      const txtPath = path.join(chatDir, `messages.txt`);
      const jsonPath = path.join(chatDir, `data.json`);
      
      // Save as formatted text
      fs.writeFileSync(txtPath, 
        messages.reverse().map(msg => formatMessage(msg)).join('\n')
      );

      // Save raw data as JSON for backup
      fs.writeFileSync(jsonPath, JSON.stringify({
        chatName,
        chatId: id,
        exportDate: new Date().toISOString(),
        totalMessages: messages.length,
        totalAttachments: attachmentsFound,
        messages
      }, null, 2));

      console.log(colorful(colors.green, 
        `\n     Export concluído!\n` +
        `     ${messages.length} mensagens em ${chatName}/messages.txt\n` +
        `     ${attachmentsFound} anexos em ${chatName}/attachments/`
      ));

    } catch (error) {
      console.log(colorful(colors.red, `     Erro ao exportar: ${error}`));
    }

    setTimeout(callback, 3000);
  });
};

module.exports = { exportChat };
