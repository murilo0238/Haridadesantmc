const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const desafios = [
    'Faça 10 flexões!',
    'Envie uma mensagem positiva para alguém.',
    'Tente não reclamar de nada hoje!',
    'Desligue o celular por 1 hora.'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('desafio_diario')
        .setDescription('Receba um desafio diário para se motivar.'),
    async execute(interaction) {
        const desafio = desafios[Math.floor(Math.random() * desafios.length)];
        const embed = new EmbedBuilder()
            .setTitle('🎯 Desafio do Dia')
            .setDescription(desafio)
            .setColor('#FF4500');
        await interaction.reply({ embeds: [embed] });
    },
};
