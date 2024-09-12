// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("cleardm")
        .setDescription(`[🔧] Limpe Minha DM (Max: 100 mensagens)`)
        .setDMPermission(false),

            // execute (command)
    async execute(interaction, client) {

        // create user dm
        const DM = await interaction.user.createDM();

        // no messages found
        const lastMessage = await DM.messages.fetch({ limit: 1 });
        if (lastMessage.size == 0) {
            await interaction.reply({
                content: `❌ | Não encontrei nenhuma mensagem em minha DM.`,
                ephemeral: true
            });
            return;
        };

        // reply - waiting
        await interaction.reply({
            content: `🔁 | Limpando minha DM! Aguarde ...`,
            ephemeral: true
        });

        // messages from dm
        const messagesToDelete = await DM.messages.fetch({ limit: 100 });

        // total deleted
        let deletedCount = 0;
        for (const message of messagesToDelete.values()) {

            // if it's a bot
            if (message.author.bot) {
                await message.delete().catch(console.error);
                deletedCount++;
            };

            // editReply - deleting messages
            await interaction.editReply({
                content: `🔁 | **${deletedCount}** mensagens apagadas ...`,
                ephemeral: true
            });

        };

        // deleted messages - confirmation
        await interaction.editReply({
            content: `✅ | Foram excluídas **${deletedCount}** mensagens em minha DM.`,
            ephemeral: true
        });

    }
};