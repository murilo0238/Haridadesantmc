const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const yaml = require('yaml');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setstatus')
        .setDescription('Altera o recado/status atual do bot.')
        .addStringOption(option => 
            option.setName('recado')
                .setDescription('O novo recado/status do bot')
                .setRequired(true)),
    async execute(interaction, updateStatusFile) {
        const newStatus = interaction.options.getString('recado');

        // Atualiza o arquivo status.yml e o status do bot
        updateStatusFile(newStatus);

        // Define o novo status imediatamente no bot
        interaction.client.user.setPresence({ activities: [{ name: newStatus }], status: 'online' });

        // Confirmação visual com embed
        const embed = new EmbedBuilder()
            .setTitle('Recado Alterado!')
            .setDescription(`O recado do bot foi atualizado para:\n\n**${newStatus}**`)
            .setColor('#00FF00');
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
