const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const yaml = require('yaml');
const fs = require('fs');

const config = yaml.parse(fs.readFileSync('./config.yml', 'utf8'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Mostra o ping do bot.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setDescription(`Latência do Bot: ${Date.now() - interaction.createdTimestamp}ms\nLatência da API: ${Math.round(interaction.client.ws.ping)}ms`)
            .setColor(config.embedColor);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
