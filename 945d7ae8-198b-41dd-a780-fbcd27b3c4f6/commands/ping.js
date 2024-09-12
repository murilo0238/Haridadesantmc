module.exports = {
  name: 'ping',
  description: 'Mostra o ping do bot.',
  execute(message, args) {
    message.reply(`Pong! Latência: ${Date.now() - message.createdTimestamp}ms`);
  },
};
