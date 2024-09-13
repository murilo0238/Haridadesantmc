const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Mostra informações sobre um usuário.')
        .addUserOption(option =>
            option.setName('usuário')
                .setDescription('O usuário sobre o qual você deseja obter informações')
                .setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuário');
        const member = interaction.guild.members.cache.get(user.id);

        // Utilizando o formato nativo do JavaScript para data
        const joinedAt = member.joinedAt.toLocaleDateString('pt-BR');

        const embed = new EmbedBuilder()
            .setTitle(`Informações do Usuário`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: 'Nome de Usuário', value: user.tag, inline: true },
                { name: 'ID do Usuário', value: user.id, inline: true },
                { name: 'Data de Entrada no Servidor', value: joinedAt, inline: true },
                { name: 'Status', value: user.presence ? user.presence.status : 'Indisponível', inline: true }
            )
            .setColor('#00A2FF')
            .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
