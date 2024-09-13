const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bane um usuário do servidor.')
        .addUserOption(option => option.setName('user').setDescription('Usuário a ser banido').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Motivo do banimento').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Nenhum motivo especificado';

        if (!interaction.member.permissions.has('BAN_MEMBERS')) {
            return interaction.reply({ content: 'Você não tem permissão para usar este comando!', ephemeral: true });
        }

        if (!interaction.guild.members.me.permissions.has('BAN_MEMBERS')) {
            return interaction.reply({ content: 'Eu não tenho permissão para banir membros!', ephemeral: true });
        }

        const member = interaction.guild.members.resolve(user);
        if (member) {
            await member.ban({ reason });
            const embed = new EmbedBuilder()
                .setTitle('Membro Banido')
                .setDescription(`**Usuário:** ${user.tag}\n**Motivo:** ${reason}`)
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply({ content: 'O usuário não está no servidor!', ephemeral: true });
        }
    },
};
