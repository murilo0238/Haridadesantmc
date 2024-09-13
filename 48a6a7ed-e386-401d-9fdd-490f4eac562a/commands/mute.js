const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Silencia um usuário no servidor.')
        .addUserOption(option => option.setName('user').setDescription('Usuário a ser silenciado').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('Duração do mute (ex: 10m, 1h)').setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');

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

            await member.roles.add(mutedRole);
            setTimeout(async () => {
                await member.roles.remove(mutedRole);
                const unmuteEmbed = new EmbedBuilder()
                    .setTitle('Desmutado')
                    .setDescription(`**Usuário:** ${user.tag}\n**Duração:** ${duration}`)
                    .setColor('#00FF00');
                await interaction.followUp({ embeds: [unmuteEmbed] });
            }, parseDuration(duration)); // Função parseDuration deve ser implementada para converter a duração

            const embed = new EmbedBuilder()
                .setTitle('Membro Mutado')
                .setDescription(`**Usuário:** ${user.tag}\n**Duração:** ${duration}`)
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply({ content: 'O usuário não está no servidor!', ephemeral: true });
        }
    },
};
