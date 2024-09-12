module.exports = {
  name: 'userinfo',
  description: 'Mostra informações de um usuário',
  async execute(message, args, config) { // Ajuste o parâmetro para `message` e `args`
    try {
      // Obtém o usuário mencionado ou o usuário que enviou a mensagem
      const user = message.mentions.users.first() || message.author;
      const member = message.guild.members.cache.get(user.id); // Obtém o membro pelo ID

      // Verifica se o membro foi encontrado
      if (!member) {
        return message.reply('Não consegui encontrar o membro no servidor.');
      }

      const embed = {
        color: parseInt(config.embedColor, 16), // Converte a cor hexadecimal para número
        title: `Informações do usuário: ${user.username}`,
        thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
        fields: [
          { name: 'Entrou no servidor em', value: member.joinedAt.toLocaleDateString('pt-BR'), inline: true },
          { name: 'Conta criada em', value: user.createdAt.toLocaleDateString('pt-BR'), inline: true },
          { name: 'Cargo(s)', value: member.roles.cache.map(role => role.name).join(', '), inline: true }
        ],
        footer: { text: `ID do usuário: ${user.id}` }
      };

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erro ao executar o comando userinfo:', error);
      await message.reply('Ocorreu um erro ao tentar obter as informações do usuário.');
    }
  },
};
