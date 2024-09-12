// event
module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {

        // isChatInputCommand
        if (interaction.isChatInputCommand()) {

            // command used
            const command = interaction.client.commands.get(interaction.commandName);

            // non-existent command
            if (!command) {
                interaction.reply({
                    content: `No command corresponding to **${interaction.commandName}** was found.`,
                    ephemeral: true
                });
                return;
            };

            // command error
            try {
                await command.execute(interaction, client);
            } catch (err) {
                interaction.reply({
                    content: `Error executing command **${interaction.commandName}**:\`\`\`js\n${err.message}\`\`\``,
                    ephemeral: true
                });
                console.error(err);
            };

        };

    },
};