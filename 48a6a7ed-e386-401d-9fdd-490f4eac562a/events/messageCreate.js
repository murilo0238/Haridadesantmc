const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    execute(message) {
        if (message.mentions.has(message.client.user) && !message.author.bot) {
            const embed = new EmbedBuilder()
                .setTitle('Olá! Eu sou o Razy!')
                .setDescription('Estou aqui para ajudar com vários comandos. Use `/ajuda` para ver mais detalhes.')
                .setColor('#FF5733')
                .setFooter({ text: 'Estou aqui para você!' })
                .setTimestamp();

            message.reply({ embeds: [embed] }).then(msg => {
                setTimeout(() => msg.delete(), 10000); // Apaga a mensagem após 10 segundos
            });
        }
    },
};
