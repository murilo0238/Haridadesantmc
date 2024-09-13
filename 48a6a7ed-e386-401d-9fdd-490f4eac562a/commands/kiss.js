const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Envia um beijo e uma mensagem engraçada.'),
    async execute(interaction) {
        const messages = [
            'Um beijo para você! 💋',
            'Beijo, seu lindo(a)! 😘',
            'Aqui está um beijo para alegrar seu dia! 😚',
            'Beijo com muito carinho! 😽'
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        await interaction.reply(randomMessage);
    },
};
