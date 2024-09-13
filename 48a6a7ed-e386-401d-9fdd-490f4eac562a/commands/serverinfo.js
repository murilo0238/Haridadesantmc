const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Mostra informações detalhadas sobre o servidor.'),
    async execute(interaction) {
        const guild = interaction.guild;
        const owner = await guild.fetchOwner();
        
        // Formatando as datas para o formato brasileiro
        const createdAt = format(guild.createdAt, 'dd/MM/yyyy', { locale: ptBR });
        const joinedAt = format(interaction.member.joinedAt, 'dd/MM/yyyy', { locale: ptBR });

        const embed = new EmbedBuilder()
            .setTitle(`Informações do Servidor`)
            .setDescription(`Aqui estão os detalhes sobre o servidor **${guild.name}**.`)
            .setColor('#FF4500') // Cor laranja avermelhada
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: 'Nome do Servidor', value: guild.name, inline: true },
                { name: 'ID do Servidor', value: guild.id, inline: true },
                { name: 'Data de Criação', value: createdAt, inline: true },
                { name: 'Membro desde', value: joinedAt, inline: true },
                { name: 'Membros Totais', value: `${guild.memberCount}`, inline: true },
                { name: 'Canais Totais', value: `${guild.channels.cache.size}`, inline: true },
                { name: 'Cargos Totais', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'Donos do Servidor', value: `${owner.user.tag}`, inline: true }
            )
            .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        
        // Envia a resposta e armazena a mensagem enviada
        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        
        // Define o tempo de expiração da mensagem
        setTimeout(() => {
            message.delete().catch(console.error);
        }, 8000); // Tempo em milissegundos (30 segundos)

    },
};
