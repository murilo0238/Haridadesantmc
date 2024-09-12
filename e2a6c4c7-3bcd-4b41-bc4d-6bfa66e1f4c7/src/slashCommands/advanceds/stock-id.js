// discord.js
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// fs - files
const fs = require("node:fs");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("stock-id")
        .setDescription("[🛠/💰] Veja o estoque de um produto!")
        .addStringOption(opString => opString
            .setName("id")
            .setDescription("ID do Produto")
            .setMaxLength(25)
            .setAutocomplete(true)
            .setRequired(true)
        )
        .setDMPermission(false),

    // autocomplete
    async autocomplete(interaction) {

        // choices - global
        const choices = [];

        // user without permission for dbPerms (wio.db)
        if (!dbPerms.has(interaction.user.id)) {
            const noPermOption = {
                name: "Você não tem permissão para usar este comando!",
                value: "no-perms"
            };
            choices.push(noPermOption);
            await interaction.respond(
                choices.map(choice => ({ name: choice.name, value: choice.value })),
            );
            return;
        };

        // pull all products into dbProducts (wio.db)
        for (const product of dbProducts.all()) {
            choices.push({
                name: `ID: ${product.ID} | Nome: ${product.data.name}`,
                value: product.ID,
            });
        };
        choices.sort((a, b) => a.value - b.value);

        // search system - autocomplete
        const searchId = interaction.options.getString("id");
        if (searchId) {

            const filteredChoices = choices.filter(choice => {
                return choice.value.startsWith(searchId);
            });
            await interaction.respond(
                filteredChoices.map(choice => ({ name: choice.name, value: choice.value })),
            );

        } else {

            const limitedChoices = choices.slice(0, 25);
            await interaction.respond(
                limitedChoices.map(choice => ({ name: choice.name, value: choice.value }))
            );
        };

    },

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

        // id product
        const idProduct = interaction.options.getString("id");

        // inserted product was not found in dbProducts (wio.db)
        if (!dbProducts.has(idProduct)) {
            await interaction.reply({
                content: `❌ | ID do produto: **${idProduct}** não foi encontrado.`,
                ephemeral: true
            });
            return;
        };

        // message - loading
        await interaction.reply({
            content: `🔁 | Carregando ...`,
            ephemeral: true
        }).then(async (msg) => {

            // all stock - product
            const estoqueP = await dbProducts.get(`${idProduct}.stock`);

            // checks if the product is in stock
            if (estoqueP.length <= 0) {
                await interaction.editReply({
                    content: `❌ | Este produto está sem estoque.`,
                    ephemeral: true
                });
                return;
            };

            // variables with product information
            const nameP = await dbProducts.get(`${idProduct}.name`);

            // gets all items from the product's stock
            let fileContent = "";
            for (let i = 0; i < estoqueP.length; i++) {
                fileContent += `📦 | ${nameP} - ${i + 1}/${estoqueP.length}:\n${estoqueP[i]}\n\n`;
            };

            // creates the txt file with the items
            const fileName = `${nameP}.txt`;
            fs.writeFile(fileName, fileContent, (err) => {
                if (err) throw err;
            });

            // creates the attachment for the files
            const stockAttachment = new AttachmentBuilder(fileName);

            // embed - stock
            const embedStock = new EmbedBuilder()
                .setTitle(`Estoque (${idProduct})`)
                .setDescription(`**📦 | Estoque no Arquivo TXT.**`)
                .setColor(`NotQuiteBlack`)
                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.`, iconURL: client.user.avatarURL() });

            // message - edit
            await interaction.editReply({
                content: ``,
                embeds: [embedStock],
                files: [stockAttachment],
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