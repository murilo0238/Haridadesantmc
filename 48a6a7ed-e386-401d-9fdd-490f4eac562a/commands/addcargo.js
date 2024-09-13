const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcargo')
        .setDescription('Adiciona um cargo a um usuário.')
        .addUserOption(option => option.setName('usuario').setDescription('Selecione o usuário').setRequired(true))
        .addRoleOption(option => option.setName('cargo').setDescription('Selecione o cargo').setRequired(true)),
        category: 'mod', // Adicione a categoria aqui
    async execute(interaction) {
        const usuario = interaction.options.getUser('usuario');
        const cargo = interaction.options.getRole('cargo');
        const membro = interaction.guild.members.cache.get(usuario.id);

        if (!membro) return interaction.reply('Usuário não encontrado no servidor.');

        await membro.roles.add(cargo);

        const embed = new EmbedBuilder()
            .setTitle('Cargo Adicionado')
            .setDescription(`O cargo **${cargo.name}** foi adicionado a **${usuario.tag}**.`)
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
