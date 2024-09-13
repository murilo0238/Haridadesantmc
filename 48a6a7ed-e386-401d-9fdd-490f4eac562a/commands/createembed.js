const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createembed')
        .setDescription('Cria um embed com título, mensagem e cor personalizados.')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('Título do embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mensagem')
                .setDescription('Mensagem do embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('cor')
                .setDescription('Cor do embed em formato hexadecimal (ex: #FF4500)')
                .setRequired(true)),
    async execute(interaction) {
        const title = interaction.options.getString('titulo');
        const message = interaction.options.getString('mensagem');
        const color = interaction.options.getString('cor');

        // Verifica se a cor está no formato hexadecimal
        const isValidHex = /^#[0-9A-F]{6}$/i.test(color);

        if (!isValidHex) {
            return interaction.reply({ content: 'Por favor, forneça uma cor válida no formato hexadecimal (ex: #FF4500).', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(message)
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: `Criado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};
