const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const elogios = [
    'Você é incrível!',
    'Seu sorriso ilumina qualquer lugar!',
    'Você faz o mundo um lugar melhor.',
    'Sua criatividade é inspiradora.'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('compliment')
        .setDescription('Elogia um usuário.')
        .addUserOption(option => option.setName('usuário').setDescription('Usuário para elogiar').setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuário');
        const elogio = elogios[Math.floor(Math.random() * elogios.length)];
        const embed = new EmbedBuilder()
            .setTitle(`💖 Elogio para ${user.username}`)
            .setDescription(elogio)
            .setColor('#FF69B4');
        await interaction.reply({ embeds: [embed] });
    },
};
