const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Envia uma citação aleatória.'),
    async execute(interaction) {
        const quotes = [
            '“O único modo de fazer um excelente trabalho é amar o que você faz.” - Steve Jobs',
            '“A vida é 10% o que acontece com você e 90% como você reage a isso.” - Charles R. Swindoll',
            '“A única maneira de fazer um excelente trabalho é amar o que você faz.” - Steve Jobs',
            '“O melhor modo de prever o futuro é criá-lo.” - Peter Drucker'
        ];

        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

        await interaction.reply(randomQuote);
    },
};
