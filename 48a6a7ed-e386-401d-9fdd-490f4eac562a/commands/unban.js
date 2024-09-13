const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Desbane um usuário do servidor.')
        .addStringOption(option => option.setName('user_id').setDescription('ID do usuário a ser desbanido').setRequired(true)),
    async execute(interaction) {
        const userId = interaction.options.getString('user_id');

        if (!interaction.member.permissions.has('BAN_MEMBERS')) {
            return interaction.reply({ content: 'Você não tem permissão para usar este comando!', ephemeral: true });
        }

        if (!interaction.guild.members.me.permissions.has('BAN_MEMBERS')) {
            return interaction.reply({ content: 'Eu não tenho permissão para desbanir membros!', ephemeral: true });
        }

        try {
            await interaction.guild.bans.remove(userId);
            const embed = new EmbedBuilder()
                .setTitle('Membro Desbanido')
                .setDescription(`**ID do Usuário:** ${userId}`)
                .setColor('#00FF00');
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({ content: 'Não foi possível desbanir o usuário. Verifique o ID.', ephemeral: true });
        }
    },
};
