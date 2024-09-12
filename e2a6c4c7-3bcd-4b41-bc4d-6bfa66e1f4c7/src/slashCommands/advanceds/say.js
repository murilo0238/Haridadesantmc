// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("[🛠] Faça eu enviar uma mensagem!")
        .addStringOption(opString => opString
            .setName(`mensagem`)
            .setDescription(`Mensagem que será enviada`)
            .setMaxLength(1800)
            .setRequired(true)
        )
        .setDMPermission(false),

    // execute (command)
    async execute(interaction, client) {

        // user without permission for dbPerms (wio.db)
        if (!dbPerms.has(interaction.user.id)) {
            await interaction.reply({
                content: `❌ | Você não tem permissão para usar este comando.`,
                ephemeral: true
            });
            return;
        };

        // variables with the information entered
        const msgInserted = interaction.options.getString(`mensagem`);

        // send the message
        await interaction.channel.send(msgInserted)
            .then(async (msg) => {

                // message - success
                await interaction.reply({
                    content: `✅ | Mensagem enviada com sucesso.`,
                    ephemeral: true
                });

            }).catch(async (err) => {

                // message - error
                await interaction.reply({
                    content: `❌ | Ocorreu um erro ao enviar a mensagem.`,
                    ephemeral: true
                });

            });

    },
};