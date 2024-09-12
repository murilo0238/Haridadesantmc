// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbPanels = new JsonDatabase({ databasePath: "./databases/dbPanels.json" });
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("del")
        .setDescription("[🛠/💰] Delete um produto cadastrado!")
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
        });

        // variables with product information
        const nameP = await dbProducts.get(`${idProduct}.name`);

        // delete the product
        await dbProducts.delete(idProduct);

        // maps the panel to format products in options
        const allPanels = dbPanels.all();

        // promise - delete the product from the panels
        await Promise.all(
            allPanels.map(async (panel) => {

                // get product ids
                const productIds = Object.keys(panel.data.products);

                // separates each product id
                for (const pId of productIds) {

                    // checks if the product id is the same as
                    // the id selected in the interaction
                    if (pId == idProduct) {

                        // delete the product from the panel
                        await dbPanels.delete(`${panel.ID}.products.${pId}`);

                    };

                };

            }),
        );

        // message - edit -  success
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setTitle(`${client.user.username} | Produto Excluido`)
                .setDescription(`✅ | Produto: **${nameP}** deletado com sucesso.`)
                .setColor(`Green`)
            ],
            components: [],
            ephemeral: true
        });

    },
};