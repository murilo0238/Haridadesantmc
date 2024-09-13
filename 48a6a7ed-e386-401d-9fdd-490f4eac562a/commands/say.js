const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Faz o bot enviar uma mensagem.')
        .addStringOption(option => option.setName('mensagem').setDescription('Mensagem para o bot enviar').setRequired(true)),
    async execute(interaction) {
        const message = interaction.options.getString('mensagem');
        await interaction.reply({ content: message });
    },
};
