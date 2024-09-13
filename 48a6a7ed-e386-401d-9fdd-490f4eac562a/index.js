const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const yaml = require('yaml');
const path = require('path');

// Carregando configurações
const config = yaml.parse(fs.readFileSync('./config.yml', 'utf8'));
let statusConfig = yaml.parse(fs.readFileSync('./status.yml', 'utf8'));

// Inicializa o cliente do Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Collection();

// Função para carregar os comandos dinamicamente
const loadCommands = () => {
    const commands = [];
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }

    // Atualizando os comandos registrados no Discord
    const rest = new REST({ version: '9' }).setToken(config.token);
    (async () => {
        try {
            console.log('Atualizando slash commands...');
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands },
            );
            console.log('Slash commands atualizados com sucesso!');
        } catch (error) {
            console.error(error);
        }
    })();
};

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction, updateStatusFile);
        } catch (error) {
            console.error(error);
            const embedError = new EmbedBuilder()
                .setTitle('Erro!')
                .setDescription('Ocorreu um erro ao executar este comando!')
                .setColor(config.embedColor);

            await interaction.reply({ embeds: [embedError], ephemeral: true });
        }
    } else if (interaction.isButton()) {
        const category = interaction.customId.split('_')[1];
        const commandsInCategory = getCommandsByCategory(category); // Função para obter comandos por categoria

        const embed = new EmbedBuilder()
            .setTitle(`Comandos de ${capitalizeFirstLetter(category)}`)
            .setDescription(commandsInCategory.map(cmd => `\`${cmd.name}\`: ${cmd.description}`).join('\n'))
            .setColor('#00A2FF');

        await interaction.update({ embeds: [embed], components: [] });
    }
});

function getCommandsByCategory(category) {
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    const commands = [];

    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        if (command.category === category) {
            commands.push({ name: command.data.name, description: command.data.description });
        }
    }

    return commands;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Carregar status e atualizar em intervalos regulares
let statusIndex = 0;
const loadStatus = () => {
    setInterval(() => {
        const statusMessage = statusConfig.statusMessages[statusIndex];
        client.user.setPresence({ activities: [{ name: statusMessage }], status: 'online' });
        statusIndex = (statusIndex + 1) % statusConfig.statusMessages.length; // Cicla os status
    }, statusConfig.updateInterval);
};

// Função para atualizar o arquivo status.yml
const updateStatusFile = (newStatus) => {
    statusConfig.statusMessages = [newStatus]; // Substitui a lista de status com o novo recado
    fs.writeFileSync('./status.yml', yaml.stringify(statusConfig), 'utf8'); // Atualiza o arquivo YAML
};

// Função para carregar eventos dinamicamente
const loadEvents = () => {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
};

// Evento disparado quando o bot está pronto
client.once('ready', () => {
    console.log(`${client.user.username} está online!`);
    loadCommands(); // Carregar comandos
    loadStatus();   // Iniciar sistema de status
    loadEvents();   // Carregar eventos
});

// Evento de interação para os comandos
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, updateStatusFile); // Passa a função updateStatusFile para os comandos
    } catch (error) {
        console.error(error);
        const embedError = new EmbedBuilder()
            .setTitle('Erro!')
            .setDescription('Ocorreu um erro ao executar este comando!')
            .setColor(config.embedColor);

        await interaction.reply({ embeds: [embedError], ephemeral: true });
    }
});

// Login no bot
client.login(config.token);
