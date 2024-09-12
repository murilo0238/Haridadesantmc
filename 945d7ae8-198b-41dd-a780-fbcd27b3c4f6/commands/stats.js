module.exports = {
  name: 'stats',
  description: 'Mostra estatísticas do jogador (em breve puxando do MySQL)',
  async execute(message, args, config) {
    // Converter cor hexadecimal para número inteiro
    const embedColor = parseInt(config.embedColor.replace('#', ''), 16);

    const embed = {
      color: embedColor, // Usar o valor convertido
      title: 'Estatísticas do jogador',
      description: 'Em breve, você verá suas estatísticas!',
    };

    // Enviar o embed e retornar a mensagem para poder apagá-la depois
    return await message.reply({ embeds: [embed], fetchReply: true });
  },
};
