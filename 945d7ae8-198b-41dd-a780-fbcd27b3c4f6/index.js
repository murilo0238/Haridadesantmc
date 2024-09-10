const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const config = require('./config.json');

// Criar o cliente do Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Quando o bot estiver pronto
client.once('ready', () => {
  console.log(`Bot logado como ${client.user.tag}`);

  // Definir o status do bot como 'streaming'
  client.user.setActivity('SantMC ao vivo!', { type: ActivityType.Streaming, url: 'https://www.twitch.tv/venixxyx' });
});

// Listener para comandos de mensagem
client.on('messageCreate', (message) => {
  // Comando de IP
  if (message.content === '!ip') {
    const ipEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('IP do Servidor de Minecraft')
      .setDescription(`O IP do nosso servidor é: **${config.minecraftIP}**`)
      .setFooter({ text: 'Conecte-se agora e divirta-se!' });

    message.channel.send({ embeds: [ipEmbed] });
  }
});

// Logar o bot
client.login(config.token);
