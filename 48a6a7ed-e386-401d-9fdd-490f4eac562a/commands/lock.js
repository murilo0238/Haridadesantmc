const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Bloqueia o canal atual.'),
    async execute(interaction) {
        const canal = interaction.channel;

        await canal.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });

        const embed = new EmbedBuilder()
            .setTitle('🔒 Canal Bloqueado')
            .setDescription(`O canal **${canal.name}** foi bloqueado.`)
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
