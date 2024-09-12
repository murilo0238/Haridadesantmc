module.exports = {
  name: 'ready',
  once: true,
  execute(client, config) {
    console.log(`Bot logado como ${client.user.tag}`);
    
    // Configurar status do bot baseado no config.yml
    client.user.setActivity(config.status.playing, { type: 'PLAYING' });
    // Você pode configurar outros status aqui, como streaming, listening, etc.
    // Exemplo: client.user.setActivity(config.status.streaming, { type: 'STREAMING', url: config.status.streaming });
  },
};
