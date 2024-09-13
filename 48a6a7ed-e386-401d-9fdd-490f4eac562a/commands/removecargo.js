const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removecargo')
        .setDescription('Remove um cargo de um usuário.')
        .addUserOption(option => option.setName('usuario').setDescription('Selecione o usuário').setRequired(true))
        .addRoleOption(option => option.setName('cargo').setDescription('Selecione o cargo').setRequired(true)),
    async execute(interaction) {
        const usuario = interaction.options.getUser('usuario');
        const cargo = interaction.options.getRole('cargo');
        const membro = interaction.guild.members.cache.get(usuario.id);

        if (!membro) return interaction.reply('Usuário não encontrado no servidor.');

        await membro.roles.remove(cargo);

        const embed = new EmbedBuilder()
            .setTitle('Cargo Removido')
            .setDescription(`O cargo **${cargo.name}** foi removido de **${usuario.tag}**.`)
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
