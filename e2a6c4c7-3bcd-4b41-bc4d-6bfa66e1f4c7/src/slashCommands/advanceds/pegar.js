// discord.js
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// fs - files
const fs = require("node:fs");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbPurchases = new JsonDatabase({ databasePath: "./databases/dbPurchases.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("pegar")
        .setDescription("[🛠/💰] Mostra os itens entregues de uma compra pelo ID!")
        .addStringOption(opString => opString
            .setName(`id`)
            .setDescription(`ID do Pedido`)
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

        // purchase - id
        const purchaseId = interaction.options.getString(`id`);

        // checks if the id entered exists in dbPurchases
        if (!dbPurchases.has(purchaseId)) {
            await interaction.reply({
                content: `❌ | ID do pedido: **${purchaseId}** não foi encontrado.`,
                ephemeral: true
            });
            return;
        };

        // message - loading
        await interaction.reply({
            content: `🔁 | Carregando ...`,
            ephemeral: true
        }).then(async (msg) => {

            // all products delivered
            const productsDelivered = await dbPurchases.get(`${purchaseId}.productsDelivered`);

            // creates the txt file with the items
            const fileName = `${purchaseId}.txt`;
            fs.writeFile(fileName, productsDelivered, (err) => {
                if (err) throw err;
            });

            // creates the attachment for the files
            const attachmentProducts = new AttachmentBuilder(fileName);

            // embed - products
            const embedProducts = new EmbedBuilder()
                .setTitle(`Pedido (${purchaseId})`)
                .setDescription(`**📦 | Itens entregues no Arquivo TXT.**`)
                .setColor(`NotQuiteBlack`)
                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

            // message - edit
            await interaction.editReply({
                content: ``,
                embeds: [embedProducts],
                files: [attachmentProducts],
                ephemeral: true
            }).then(async (msgEdited) => {

                // delete the file after sending
                fs.unlink(fileName, (err) => {
                    if (err) throw err;
                });

            });

        });

    },
};