const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Envia uma piada aleatória em português.'),
    async execute(interaction) {
        try {
            const response = await axios.get('https://api.piadas.com.br/random');
            const joke = response.data;
            await interaction.reply(`${joke.piada}`);
        } catch (error) {
            await interaction.reply({ content: 'Não consegui obter uma piada no momento. Tente novamente mais tarde.', ephemeral: true });
        }
    },
};
