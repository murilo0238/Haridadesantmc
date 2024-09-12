module.exports = {
  name: 'ip',
  description: 'Mostra o IP do servidor de Minecraft',
  async execute(interaction, args, config) {
    // Converter cor hexadecimal para número inteiro
    const embedColor = parseInt(config.embedColor.replace('#', ''), 16);

    // Criar o embed com informações detalhadas
    const embed = {
      color: embedColor,
      title: 'Endereço do Servidor Minecraft',
      description: 'Conecte-se ao nosso servidor de Minecraft usando o IP abaixo:',
      fields: [
        { name: '📍 IP do Servidor', value: '**jogar.santmc.com**', inline: true },
        { name: '🕒 Status', value: 'Online', inline: true },
        { name: '🌐 Website', value: '[Visite nosso site](https://foru.santmc.com/)', inline: true },
        { name: '📢 Mais Informações', value: 'Junte-se à nossa comunidade no [Discord](https://discord.santmc.com/)', inline: true }
      ],
      footer: { text: 'Entre e se divirta!' },
      timestamp: new Date() // Adiciona o timestamp para o embed
    };

    // Enviar o embed e pegar a mensagem para poder apagá-la depois
    const sentMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Apagar a mensagem após 5 segundos
    setTimeout(() => {
      sentMessage.delete().catch(console.error);
    }, 15000);
  },
};
