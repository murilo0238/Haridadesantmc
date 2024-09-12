// discord.js
const { EmbedBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("users-perm")
        .setDescription("[🛠/💰] Veja os usuários que tem permissão para usar minhas funções!")
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

        // variable with users
        const usersVariable = [];
        for (const userDB of dbPerms.all()) {
            const userId = userDB[`ID`];
            const user = await client.users.fetch(userId);
            if (user) {
                usersVariable.push(`👤 | ${user} | ${user.username}`);
            };
        };

        // total users - number
        const usersTotal = dbPerms.all().length;

        // embed - users
        const embedUsers = new EmbedBuilder()
            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
            .setTitle(`Usuários com Permissão (${usersTotal})`)
            .setDescription(`${usersVariable.join(`\n`) || `❌ | Nenhum usuário encontrado.`}`)
            .setColor(`NotQuiteBlack`)

        // message - users
        await interaction.reply({
            embeds: [embedUsers],
            ephemeral: true
        });

    },
};