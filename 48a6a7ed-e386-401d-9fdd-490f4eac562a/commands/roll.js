const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Rola um dado de 6 lados.'),
    async execute(interaction) {
        const roll = Math.floor(Math.random() * 6) + 1;
        const embed = new EmbedBuilder()
            .setTitle('🎲 Rolagem de Dado')
            .setDescription(`Resultado: ${roll}`)
            .setColor('#00A2FF');
        await interaction.reply({ embeds: [embed] });
    },
};
