const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpa um número específico de mensagens do canal.')
        .addIntegerOption(option => 
            option.setName('quantidade')
                .setDescription('Número de mensagens a serem limpas')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    async execute(interaction) {
        const amount = interaction.options.getInteger('quantidade');

        // Certifica-se de que o valor não excede o limite
        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: 'Você deve fornecer um número entre 1 e 100.', ephemeral: true });
        }

        // Limpa as mensagens
        await interaction.channel.messages.fetch({ limit: amount })
            .then(messages => {
                interaction.channel.bulkDelete(messages, true);
                interaction.reply({ content: `**${amount}** mensagens foram limpas.`, ephemeral: true });
            })
            .catch(err => {
                console.error(err);
                interaction.reply({ content: 'Ocorreu um erro ao tentar limpar as mensagens.', ephemeral: true });
            });
    },
};
