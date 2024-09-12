// discord.js
const { EmbedBuilder } = require("discord.js");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });

// event
module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {

        // isButton
        if (interaction.isButton()) {

            // button id
            const buttonId = interaction.customId;

            // showSecurityKey - button
            if (buttonId == `showSecurityKey`) {

                // no owner - user without owner in dbConfigs (wio.db)
                const ownerId = await dbConfigs.get(`ownerId`);
                if (ownerId != interaction.user.id) {
                    await interaction.reply({
                        content: `❌ | Você não tem permissão para visualizar a chave de segurança.`,
                        ephemeral: true
                    });
                    return;
                };

                // security key
                const securityKey = await dbConfigs.get(`securityKey`);

                // embed - security key
                const embedSecurityKey = new EmbedBuilder()
                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                    .setDescription(`⚠ | Por favor, mantenha esta chave em absoluto sigilo. Ela concede acesso direto à transferência de propriedade da aplicação **${client.user.username}** e não deve, sob hipótese alguma, ser compartilhada com qualquer outra pessoa.`)
                    .addFields(
                        { name: `🔑 | Chave de Segurança:`, value: `${securityKey}` }
                    )
                    .setColor(`NotQuiteBlack`)
                    .setTimestamp()

                // message - security key
                await interaction.reply({
                    embeds: [embedSecurityKey],
                    ephemeral: true
                });

            };

        };

    },
};