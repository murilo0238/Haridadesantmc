const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const frases = [
    'Acredite em você mesmo e em tudo que você é.',
    'O sucesso é a soma de pequenos esforços repetidos diariamente.',
    'Nunca é tarde demais para ser o que você poderia ter sido.',
    'Seu único limite é você mesmo.'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('motivar')
        .setDescription('Receba uma frase motivacional.'),
    async execute(interaction) {
        const frase = frases[Math.floor(Math.random() * frases.length)];
        const embed = new EmbedBuilder()
            .setTitle('🌟 Motivação do Dia')
            .setDescription(frase)
            .setColor('#32CD32');
        await interaction.reply({ embeds: [embed] });
    },
};
