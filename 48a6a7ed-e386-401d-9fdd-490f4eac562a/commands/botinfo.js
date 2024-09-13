const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Exibe informações sobre o bot.'),
    async execute(interaction) {
        const uptime = process.uptime();
        const horas = Math.floor(uptime / 3600);
        const minutos = Math.floor((uptime % 3600) / 60);
        const segundos = Math.floor(uptime % 60);

        const botInfoEmbed = new EmbedBuilder()
            .setTitle('🤖 Informações do Bot')
            .setColor('#7289DA')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: 'Nome', value: interaction.client.user.username, inline: true },
                { name: 'ID', value: interaction.client.user.id, inline: true },
                { name: 'Shard', value: 'Shard 1', inline: true },
                { name: 'Servidores', value: `${interaction.client.guilds.cache.size}`, inline: true },
                { name: 'Usuários', value: `${interaction.client.users.cache.size}`, inline: true },
                { name: 'Uptime', value: `${horas}h ${minutos}m ${segundos}s`, inline: true },
                { name: 'Sistema Operacional', value: `${os.type()} ${os.release()}`, inline: true },
                { name: 'Memória Usada', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
            )
            .setFooter({ text: `Hospedado no Shard 1` })
            .setTimestamp();

        await interaction.reply({ embeds: [botInfoEmbed] });
    },
};
