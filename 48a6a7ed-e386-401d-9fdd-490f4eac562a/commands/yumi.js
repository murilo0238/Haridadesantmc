const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yumi')
        .setDescription('Manda uma mensagem especial para a Yumi'),
    async execute(interaction) {
        const yumiEmbed = new EmbedBuilder()
            .setTitle('💖 Para a Yumi 💖')
            .setDescription('Oi, Yumi! 🌸\n\nEspero que o seu dia esteja tão maravilhoso quanto você! Lembre-se de que você é uma pessoa incrível e todos ao seu redor têm muita sorte de ter você por perto.\n\nQue seu sorriso continue iluminando o mundo e que você sempre encontre alegria nas pequenas coisas da vida. 💕')
            .setColor('#FF69B4')
            .setThumbnail('https://example.com/cute_image.png') // Insira uma URL de imagem bonitinha, se quiser
            .setFooter({ text: 'Com carinho, do seu amigo especial 😊', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [yumiEmbed] });
    },
};
