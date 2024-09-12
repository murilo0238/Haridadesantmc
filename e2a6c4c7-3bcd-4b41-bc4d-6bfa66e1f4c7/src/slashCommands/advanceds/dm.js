// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("dm")
        .setDescription("[🛠] Envie uma mensagem privada para algum usuário!")
        .addUserOption(opUser => opUser
            .setName(`usuário`)
            .setDescription(`Usuário que irá receber a DM`)
            .setRequired(true)
        )
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
        const userSelected = interaction.options.getUser(`usuário`);
        const msgInserted = interaction.options.getString(`mensagem`);

        // try to send the dm to the user
        await userSelected.send(msgInserted)
            .then(async (msg) => {

                // message - success
                await interaction.reply({
                    content: `✅ | Mensagem enviada com sucesso para o usuário ${userSelected}.`,
                    ephemeral: true
                });

            }).catch(async (err) => {

                // message - error
                await interaction.reply({
                    content: `❌ | Ocorreu um erro ao enviar uma mensagem privada para o usuário ${userSelected}.`,
                    ephemeral: true
                });

            });

    },
};