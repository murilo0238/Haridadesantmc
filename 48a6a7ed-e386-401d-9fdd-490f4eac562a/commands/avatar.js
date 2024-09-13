const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Mostra o avatar de um usuário.')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('O usuário cujo avatar você deseja ver')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuário');

        const embed = new EmbedBuilder()
            .setTitle(`Avatar de ${user.username}`)
            .setImage(user.displayAvatarURL({ size: 2048, format: 'png', dynamic: true }))
            .setColor('#00A2FF')
            .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
