const fs = require('fs');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const yaml = require('js-yaml');

// Carregar configuração do config.yml
const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Carregar todos os comandos
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// Carregar eventos
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, config));
  } else {
    client.on(event.name, (...args) => event.execute(...args, config));
  }
}

// Login do bot
client.login(config.token);

console.log(`Prefixo configurado: ${config.prefix}`);
