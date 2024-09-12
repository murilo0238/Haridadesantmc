// discord.js
const { ActionRowBuilder, UserSelectMenuBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("remove-perm")
        .setDescription("[🛠/💰] Remova permissão de algum usuário!")
        .setDMPermission(false),

            // execute (command)
    async execute(interaction, client) {

        // no owner - user without owner in dbConfigs (wio.db)
        const ownerId = await dbConfigs.get(`ownerId`);
        if (ownerId != interaction.user.id) {
            await interaction.reply({
                content: `❌ | Você não tem permissão para usar este comando.`,
                ephemeral: true
            });
            return;
        };

        // row - users (1)
        const rowUsers1 = new ActionRowBuilder()
            .addComponents(
                new UserSelectMenuBuilder().setCustomId(`usersMenu`).setPlaceholder(`Selecione um Usuário`)
            );

        // message - users
        await interaction.reply({
            content: `🔐 | Selecione um usuário no menu abaixo!`,
            components: [rowUsers1],
            ephemeral: true
        });

        // try catch
        try {

            // collector - awaitMessageComponent
            const iPerm = await interaction.channel.awaitMessageComponent({ time: 120000 });

            // usersMenu
            if (iPerm.customId == `usersMenu`) {

                // value/value chosen in the select menu
                const valueSelected = iPerm.values[0];

                // user - fetch
                const userSelected = await client.users.fetch(valueSelected);

                // user is already in dbPerms (wio.db)
                const userExisting = await dbPerms.get(userSelected.id);
                if (!userExisting) {
                    await interaction.editReply({
                        content: `❌ | O usuário ${userSelected} não tem permissão para usar minhas funções.`,
                        components: [],
                        ephemeral: true
                    });
                    return;
                };

                // set the user in dbPerms (wio.db)
                await dbPerms.delete(userSelected.id);

                // editReply - success
                await interaction.editReply({
                    content: `✅ | O usuário ${userSelected} teve suas permissões removidas.`,
                    components: [],
                    ephemeral: true
                });

            };

        } catch (err) {
            return;
        };

    },
};