module.exports = {
  name: 'messageCreate',
  async execute(message, config) {
    if (message.author.bot) return; // Ignorar mensagens de bots
    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = message.client.commands.get(commandName);

    if (!command) return;

    try {
      // Execute o comando e envie uma resposta
      const response = await command.execute(message, args, config);

      // Apagar a mensagem do comando após 5 segundos
      setTimeout(() => {
        message.delete().catch(console.error);
      }, 5000);

      // Se o comando retornar uma resposta, apague-a após 10 segundos
      if (response && response instanceof Object && response.deletable) {
        setTimeout(() => {
          response.delete().catch(console.error);
        }, 10000);
      }

    } catch (error) {
      console.error('Erro ao executar o comando:', error);
      const errorMsg = await message.reply('Ocorreu um erro ao executar esse comando!');
      setTimeout(() => {
        errorMsg.delete().catch(console.error);
      }, 10000);
    }
  },
};
