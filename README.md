# Sabado Animado

Um gerenciador de selfbot para Discord com múltiplas funcionalidades de limpeza e gerenciamento de conta.

## ⚠️ Aviso Importante

**Este projeto é apenas para fins educacionais e de desenvolvimento. O uso de selfbots viola os Termos de Serviço do Discord e pode resultar no banimento da sua conta. Use por sua conta e risco.**

## 🚀 Funcionalidades

- **Limpeza de DMs**: Remove mensagens de conversas diretas
- **Limpeza de DMs de Amigos**: Remove mensagens apenas de amigos
- **Remoção de Amizades**: Remove amigos da lista de amigos
- **Remoção de Servidores**: Sai de servidores automaticamente
- **Fechamento de DMs**: Fecha todas as conversas diretas
- **Sistema de Whitelist**: Protege usuários específicos da limpeza
- **Exportação de Chat**: Exporta conversas para arquivo
- **Monitoramento de Voz**: Monitora usuários em chamadas de voz
- **Selfbot Avançado**: Funcionalidades adicionais de selfbot
- **Rich Presence**: Status personalizado no Discord
- **Gerenciamento de Múltiplas Contas**: Suporte a várias contas

## 📋 Pré-requisitos

- Node.js 18+ 
- NPM ou Yarn
- Token de usuário do Discord (não bot token)

## 🚀 Como Usar

### Método 1: Usando o script batch (Windows)
```bash
start.bat
```

### Método 2: Usando npm
```bash
npm start
```

### Método 3: Executando diretamente
```bash
node src/index.js
```

## 📁 Estrutura do Projeto

```
unlucky/
├── src/
│   ├── commands/          # Comandos principais
│   │   ├── menu.js        # Menu principal
│   │   ├── login.js       # Sistema de login
│   │   ├── clearDm.js     # Limpeza de DMs
│   │   ├── removeFriends.js # Remoção de amigos
│   │   ├── removeServers.js # Remoção de servidores
│   │   ├── whitelist.js   # Sistema de whitelist
│   │   ├── chatExport.js  # Exportação de chat
│   │   ├── monitorUserVoice.js # Monitoramento de voz
│   │   └── selfbot.js     # Funcionalidades de selfbot
│   ├── utils/             # Utilitários
│   │   ├── colors.js      # Sistema de cores
│   │   ├── banner.js      # Banner do projeto
│   │   ├── settings.js    # Gerenciamento de configurações
│   │   └── accountManager.js # Gerenciamento de contas
│   ├── index.js           # Arquivo principal
│   └── settings.json      # Configurações
├── package.json           # Dependências e scripts
├── start.bat             # Script de inicialização (Windows)
└── README.md             # Este arquivo
```

## ⚙️ Configuração

### Configurações Básicas
O arquivo `src/settings.json` contém as configurações principais do projeto.

### Sistema de Whitelist
- Adicione usuários à whitelist para protegê-los das operações de limpeza
- Acesse através do menu principal (opção 6)

### Gerenciamento de Contas
- O sistema suporta múltiplas contas
- As configurações são salvas por usuário
- Acesse através do menu de gerenciamento de contas

## 🔧 Scripts Disponíveis

```bash
npm start          # Inicia o aplicativo
npm run dev        # Inicia em modo desenvolvimento com nodemon
npm run build      # Compila para executável
npm run build:clean # Compila sem bytecode
```

## 📦 Dependências

- **discord.js-selfbot-v13**: Cliente selfbot para Discord
- **axios**: Cliente HTTP para requisições
- **node-fetch**: Fetch API para Node.js
- **nodemon**: Reinicialização automática em desenvolvimento

## 🎯 Funcionalidades Detalhadas

### 1. Limpeza de DMs
- Remove mensagens de conversas diretas
- Suporte a filtros por usuário
- Sistema de confirmação antes da exclusão

### 2. Sistema de Whitelist
- Protege usuários específicos
- Configuração por conta
- Interface intuitiva de gerenciamento

### 3. Monitoramento de Voz
- Monitora usuários em chamadas de voz
- Notificações em tempo real
- Logs detalhados de atividade

### 4. Rich Presence
- Status personalizado no Discord
- Botões e imagens customizadas
- Atualização automática

## 🚨 Limitações e Considerações

- **Violação dos ToS**: Selfbots violam os Termos de Serviço do Discord
- **Risco de Ban**: Uso pode resultar em banimento da conta
- **Rate Limiting**: Respeite os limites de API do Discord
- **Uso Responsável**: Use apenas em contas próprias e com responsabilidade

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo `LICENSE` para mais detalhes.

## ⚖️ Disclaimer

Este software é fornecido "como está", sem garantias de qualquer tipo. Os desenvolvedores não são responsáveis por qualquer dano ou consequência do uso deste software. O uso de selfbots pode violar os Termos de Serviço do Discord e resultar em banimento da conta.

**⚠️ Lembre-se: Use este software com responsabilidade e apenas em suas próprias contas.**
