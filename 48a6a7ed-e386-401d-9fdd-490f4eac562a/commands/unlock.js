const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Desbloqueia o canal atual.'),
    async execute(interaction) {
        const canal = interaction.channel;

        await canal.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });

        const embed = new EmbedBuilder()
            .setTitle('🔓 Canal Desbloqueado')
            .setDescription(`O canal **${canal.name}** foi desbloqueado.`)
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
