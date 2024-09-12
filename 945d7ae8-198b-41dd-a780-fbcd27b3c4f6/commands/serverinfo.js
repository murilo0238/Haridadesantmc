module.exports = {
  name: 'userinfo',
  description: 'Mostra informações de um usuário',
  async execute(message, args, config) {
    const user = message.author;
    const member = message.guild.members.cache.get(user.id);

    // Converter cor hexadecimal para número inteiro
    const embedColor = parseInt(config.embedColor.replace('#', ''), 16);

    const embed = {
      color: embedColor, // Usar o valor convertido
      title: `Informações do usuário: ${user.username}`,
      thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
      fields: [
        { name: 'Entrou no servidor em', value: member.joinedAt.toLocaleDateString('pt-BR'), inline: true },
        { name: 'Conta criada em', value: user.createdAt.toLocaleDateString('pt-BR'), inline: true },
        { name: 'Cargo(s)', value: member.roles.cache.map(role => role.name).join(', '), inline: true }
      ],
      footer: { text: `ID do usuário: ${user.id}` }
    };

    // Enviar o embed e retornar a mensagem para poder apagá-la depois
    return await message.reply({ embeds: [embed], fetchReply: true });
  },
};
