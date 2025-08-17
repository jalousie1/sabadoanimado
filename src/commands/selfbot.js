const { colorful, colors } = require('../utils/colors');
const banner = require('../utils/banner');

let voiceStateListener = null;
let autoDisconnectUserId = null;
let nicknameEnforceListener = null;
let nicknameEnforceInterval = null;

function waitForCancelKey(rl, onCancel) {
  const stdin = process.stdin;
  const printHint = () => console.log(colorful(colors.yellow, '     [!] Pressione Q ou 0 para cancelar.'));

  if (stdin && typeof stdin.setRawMode === 'function' && stdin.isTTY) {
    printHint();
    const onData = (buf) => {
      const key = buf.toString();
      const lower = key.toLowerCase();
      // Ctrl+C, 'q' or '0'
      if (key.charCodeAt(0) === 3 || lower === 'q' || lower === '0') {
        stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        onCancel();
      }
    };
    stdin.setRawMode(true);
    stdin.on('data', onData);
  } else {
    // Fallback: sem TTY
    printHint();
    rl.question('     [-] Pressione Enter para cancelar: ', () => onCancel());
  }
}

async function ensureSelfMember(guild, client) {
  const existing = guild.members.cache.get(client.user.id);
  if (existing) return existing;
  return guild.members.fetch(client.user.id);
}

async function disconnectUserIfInMyChannel(newState, client) {
  try {
    if (!autoDisconnectUserId) return;
    if (newState.id !== autoDisconnectUserId) return;

    const guild = newState.guild;
    if (!guild) return;

    const selfMember = await ensureSelfMember(guild, client);
    const selfChannelId = selfMember?.voice?.channelId;
    const targetChannelId = newState?.channelId;

    if (!selfChannelId || !targetChannelId) return;
    if (selfChannelId !== targetChannelId) return;

    const targetMember = newState.member || (await guild.members.fetch(autoDisconnectUserId));
    if (!targetMember?.voice) return;

    await targetMember.voice.setChannel(null, 'Auto-disconnect by selfbot');
    console.log(colorful(colors.green, `     [✓] Usuário ${targetMember.user?.tag || autoDisconnectUserId} desconectado da call.`));
  } catch (error) {
    console.log(colorful(colors.red, '     [x] Falha ao desconectar o usuário: ' + (error?.message || String(error))));
  }
}

function setupAutoDisconnect(rl, client, onDone) {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     [=] Auto-desconectar usuário quando entrar na sua call'));

  rl.question(colorful(colors.cyan, '     [-] ID do usuário alvo: '), async (userIdInput) => {
    const userId = userIdInput.trim();
    if (!/^\d+$/.test(userId)) {
      console.log(colorful(colors.red, '     [x] ID inválido.'));
      return setTimeout(onDone, 2000);
    }

    autoDisconnectUserId = userId;

    if (voiceStateListener) {
      client.removeListener('voiceStateUpdate', voiceStateListener);
      voiceStateListener = null;
    }

    voiceStateListener = async (oldState, newState) => {
      await disconnectUserIfInMyChannel(newState, client);
    };

    client.on('voiceStateUpdate', voiceStateListener);
    console.log(colorful(colors.green, `     [✓] Monitor ativo. O usuário ${userId} será desconectado sempre que entrar na sua call.`));
    waitForCancelKey(rl, () => {
      try {
        if (voiceStateListener) {
          client.removeListener('voiceStateUpdate', voiceStateListener);
        }
      } finally {
        voiceStateListener = null;
        autoDisconnectUserId = null;
      }
      console.log(colorful(colors.yellow, '     [=] Auto-desconectar parado.'));
      setTimeout(onDone, 1200);
    });
  });
}

function changeUserNickname(rl, client, onDone) {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     [=] Trocar apelido de um usuário em um servidor'));
  console.log(colorful(colors.yellow, '     [!] Digite 0 para cancelar a qualquer momento.'));

  let currentGuild = null;
  let currentMember = null;

  const askGuild = () => {
    rl.question(colorful(colors.cyan, '     [-] ID do servidor (Guild): '), async (guildIdInput) => {
      const guildId = guildIdInput.trim();
      if (guildId === '0') return onDone();
      if (!/^\d+$/.test(guildId)) {
        console.log(colorful(colors.red, '     [x] Guild ID inválido.'));
        return setTimeout(askGuild, 1000);
      }
      try {
        currentGuild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId);
        if (!currentGuild) throw new Error('Servidor não encontrado');
        askUser();
      } catch (e) {
        console.log(colorful(colors.red, '     [x] ' + (e?.message || 'Falha ao buscar servidor')));
        setTimeout(askGuild, 1000);
      }
    });
  };

  const askUser = () => {
    rl.question(colorful(colors.cyan, '     [-] ID do usuário: '), async (userIdInput) => {
      const userId = userIdInput.trim();
      if (userId === '0') return onDone();
      if (!/^\d+$/.test(userId)) {
        console.log(colorful(colors.red, '     [x] User ID inválido.'));
        return setTimeout(askUser, 1000);
      }
      try {
        currentMember = currentGuild.members.cache.get(userId) || await currentGuild.members.fetch(userId);
        if (!currentMember) throw new Error('Membro não encontrado');
        nickLoop();
      } catch (e) {
        console.log(colorful(colors.red, '     [x] ' + (e?.message || 'Falha ao buscar membro')));
        setTimeout(askUser, 1000);
      }
    });
  };

  const nickLoop = () => {
    rl.question(colorful(colors.cyan, '     [-] Novo apelido (0 para sair, !alvo para mudar usuário): '), async (nicknameInput) => {
      const newNick = nicknameInput.trim();
      if (newNick === '0') return onDone();
      if (newNick.toLowerCase() === '!alvo') return askUser();
      if (!newNick) {
        console.log(colorful(colors.red, '     [x] Apelido não pode ser vazio.'));
        return setTimeout(nickLoop, 800);
      }
      try {
        await currentMember.setNickname(newNick, 'Alterado via selfbot');
        console.log(colorful(colors.green, `     [✓] Apelido de ${currentMember.user?.tag || currentMember.id} alterado para "${newNick}".`));
      } catch (e) {
        console.log(colorful(colors.red, '     [x] Falha ao alterar apelido: ' + (e?.message || String(e))));
      }
      setTimeout(nickLoop, 1000);
    });
  };

  askGuild();
}

function showSelfbotMenu(rl, client, settings, showMenuCallback) {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     [=] Selfbot'));
  console.log('');
  console.log(colorful(colors.green, '     [1] Desconectar usuário quando entrar na minha call'));
  console.log(colorful(colors.green, '     [2] modo flpenis trocar nick'));
  console.log(colorful(colors.green, '     [0] Voltar'));
  console.log('');

  rl.question('     [-] Escolha: ', (choice) => {
    switch (choice) {
      case '1':
        setupAutoDisconnect(rl, client, () => showSelfbotMenu(rl, client, settings, showMenuCallback));
        break;
      case '2':
        enforceUserNickname(rl, client, () => showSelfbotMenu(rl, client, settings, showMenuCallback));
        break;
      case '0':
        showMenuCallback();
        break;
      default:
        console.log('Opção inválida!');
        setTimeout(() => showSelfbotMenu(rl, client, settings, showMenuCallback), 1500);
    }
  });
}

function enforceUserNickname(rl, client, onDone) {
  console.clear();
  console.log(colorful(colors.blue, banner));
  console.log(colorful(colors.blue, '     [=] Travar apelido e reverter automaticamente'));
  console.log(colorful(colors.yellow, '     [!] Pressione Q ou 0 para cancelar.'));

  let targetGuildId = null;
  let targetUserId = null;
  let desiredNick = null;
  let guild = null;

  const askGuild = () => {
    rl.question(colorful(colors.cyan, '     [-] ID do servidor (Guild): '), async (guildIdInput) => {
      const raw = guildIdInput.trim();
      if (raw === '0') return onDone();
      if (!/^\d+$/.test(raw)) {
        console.log(colorful(colors.red, '     [x] Guild ID inválido.'));
        return setTimeout(askGuild, 1000);
      }
      try {
        guild = client.guilds.cache.get(raw) || await client.guilds.fetch(raw);
        if (!guild) throw new Error('Servidor não encontrado');
        targetGuildId = raw;
        askUser();
      } catch (e) {
        console.log(colorful(colors.red, '     [x] ' + (e?.message || 'Falha ao buscar servidor')));
        setTimeout(askGuild, 1000);
      }
    });
  };

  const askUser = () => {
    rl.question(colorful(colors.cyan, '     [-] ID do usuário: '), async (userIdInput) => {
      const raw = userIdInput.trim();
      if (raw === '0') return onDone();
      if (!/^\d+$/.test(raw)) {
        console.log(colorful(colors.red, '     [x] User ID inválido.'));
        return setTimeout(askUser, 1000);
      }
      try {
        const member = guild.members.cache.get(raw) || await guild.members.fetch(raw);
        if (!member) throw new Error('Membro não encontrado');
        targetUserId = raw;
        askNick();
      } catch (e) {
        console.log(colorful(colors.red, '     [x] ' + (e?.message || 'Falha ao buscar membro')));
        setTimeout(askUser, 1000);
      }
    });
  };

  const askNick = () => {
    rl.question(colorful(colors.cyan, '     [-] Apelido desejado (será aplicado continuamente): '), async (nickInput) => {
      const raw = nickInput.trim();
      if (raw === '0') return onDone();
      if (!raw) {
        console.log(colorful(colors.red, '     [x] Apelido não pode ser vazio.'));
        return setTimeout(askNick, 800);
      }
      desiredNick = raw;
      startEnforcement();
    });
  };

  const startEnforcement = async () => {
    try {
      const member = guild.members.cache.get(targetUserId) || await guild.members.fetch(targetUserId);
      await member.setNickname(desiredNick, 'Enforce nickname by selfbot');
      console.log(colorful(colors.green, `     [✓] Monitorando ${member.user?.tag || targetUserId} no servidor ${guild.name}.`));
    } catch (e) {
      console.log(colorful(colors.red, '     [x] Falha ao aplicar apelido inicial: ' + (e?.message || String(e))));
    }

    // Garantir que não há intervalos antigos
    if (nicknameEnforceInterval) {
      clearInterval(nicknameEnforceInterval);
      nicknameEnforceInterval = null;
    }

    // Registrar listener para reverter imediatamente quando o apelido mudar
    if (nicknameEnforceListener) {
      client.removeListener('guildMemberUpdate', nicknameEnforceListener);
      nicknameEnforceListener = null;
    }

    nicknameEnforceListener = async (oldMember, newMember) => {
      try {
        if (!newMember?.guild || newMember.guild.id !== targetGuildId) return;
        if (newMember.id !== targetUserId) return;
        const currentNick = newMember.nickname ?? null;
        if (currentNick !== desiredNick) {
          await newMember.setNickname(desiredNick, 'Revert nickname by selfbot');
          console.log(colorful(colors.yellow, `     [=] Apelido revertido para "${desiredNick}".`));
        }
      } catch (err) {
        // silencioso para evitar spam no console
      }
    };

    client.on('guildMemberUpdate', nicknameEnforceListener);

    waitForCancelKey(rl, () => {
      try {
        if (nicknameEnforceInterval) clearInterval(nicknameEnforceInterval);
        if (nicknameEnforceListener) {
          client.removeListener('guildMemberUpdate', nicknameEnforceListener);
        }
      } finally {
        nicknameEnforceInterval = null;
        nicknameEnforceListener = null;
      }
      console.log(colorful(colors.yellow, '     [=] Travamento de apelido parado.'));
      setTimeout(onDone, 1200);
    });
  };

  askGuild();
}

module.exports = { showSelfbotMenu };


