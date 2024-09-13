const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Desmuta um usuário no servidor.')
        .addUserOption(option => option.setName('user').setDescription('Usuário a ser desmutado').setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');

        if (!interaction.member.permissions.has('MANAGE_ROLES')) {
            return interaction.reply({ content: 'Você não tem permissão para usar este comando!', ephemeral: true });
        }

        if (!interaction.guild.members.me.permissions.has('MANAGE_ROLES')) {
            return interaction.reply({ content: 'Eu não tenho permissão para gerenciar cargos!', ephemeral: true });
        }

        const member = interaction.guild.members.resolve(user);
        if (member) {
            // Supondo que você tenha um cargo de "Muted" configurado
            const mutedRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
            if (!mutedRole) return interaction.reply({ content: 'O cargo "Muted" não foi encontrado!', ephemeral: true });

            await member.roles.remove(mutedRole);
            const embed = new EmbedBuilder()
                .setTitle('Membro Desmutado')
                .setDescription(`**Usuário:** ${user.tag}`)
                .setColor('#00FF00');
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply({ content: 'O usuário não está no servidor!', ephemeral: true });
        }
    },
};
