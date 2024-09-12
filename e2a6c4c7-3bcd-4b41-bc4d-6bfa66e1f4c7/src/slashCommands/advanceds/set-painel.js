// discord.js
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

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
        .setName("set-painel")
        .setDescription("[🛠/💰] Sete a mensagem de compra de um painel com select menu!")
        .addStringOption(opString => opString
            .setName("id")
            .setDescription("ID do Painel")
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

        // pull all panels into dbPanels (wio.db)
        for (const panel of dbPanels.all()) {
            choices.push({
                name: `ID: ${panel.ID} | Produtos: ${Object.keys(panel.data.products).length}`,
                value: panel.ID,
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

        // id panel
        const idPanel = interaction.options.getString("id");

        // inserted panel was not found in dbPanels (wio.db)
        if (!dbPanels.has(idPanel)) {
            await interaction.reply({
                content: `❌ | ID do painel: **${idPanel}** não foi encontrado.`,
                ephemeral: true
            });
            return;
        };

        // variables with panel embed information
        const titleP = await dbPanels.get(`${idPanel}.embed.title`);
        const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
        const colorP = await dbPanels.get(`${idPanel}.embed.color`);
        const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
        const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
        const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

        // variables with panel select menu information
        const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);

        // variable with the options for each product set on the panel
        let allOptions = [];
        let totalProducts = 0;

        // maps the panel to format products in options
        const allPanels = dbPanels.all()
            .filter((panel) => panel.ID == idPanel);

        // promise - products
        await Promise.all(
            allPanels.map(async (panel) => {

                // get product ids
                const productIds = Object.keys(panel.data.products);

                // separates each product id
                for (const pId of productIds) {

                    // change the variable for the number of products in the panel
                    totalProducts = productIds.length;

                    // variables with product information by dbProducts (wio.db)
                    const nameP = await dbProducts.get(`${pId}.name`);
                    const priceP = await dbProducts.get(`${pId}.price`);
                    const estoqueP = await dbProducts.get(`${pId}.stock`);

                    // variables with product information by dbPanels (wio.db)
                    const emojiP = await dbPanels.get(`${idPanel}.products.${pId}.emoji`);

                    // pulls the products in option to the variable
                    allOptions.push(
                        {
                            label: `${nameP}`,
                            emoji: `${emojiP}`,
                            description: `Preço: R$${Number(priceP).toFixed(2)} - Estoque: ${estoqueP.length}`,
                            value: `${pId}`
                        }
                    );

                };

            }),
        );

        // checks if the panel has products
        if (totalProducts < 1) {

            // message - error
            await interaction.reply({
                content: `❌ | Este painel ainda não possui produtos. Por favor, adicione produtos e tente novamente!.`,
                ephemeral: true
            });

            return;
        };

        // row panel
        const rowPanel = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(idPanel)
                    .setPlaceholder(placeholderP)
                    .addOptions(allOptions)
            );

        // embed panel
        const embedPanel = new EmbedBuilder()
            .setTitle(titleP)
            .setDescription(descriptionP)
            .setColor(colorP != "none" ? colorP : `NotQuiteBlack`)
            .setThumbnail(thumbP != "none" ? thumbP : "https://sem-img.com")
            .setImage(bannerP != "none" ? bannerP : "https://sem-img.com")
            .setFooter({ text: footerP != "none" ? footerP : " " });

        // channel - send - product
        const msg = await interaction.channel.send({
            embeds: [embedPanel],
            components: [rowPanel]
        });

        // saves the location of the purchase panel in dbPanels (wio.db)
        await dbPanels.set(`${idPanel}.msgLocalization.channelId`, interaction.channel.id);
        await dbPanels.set(`${idPanel}.msgLocalization.messageId`, msg.id);

        // reply - success
        await interaction.reply({
            content: `✅ | Painel setado com sucesso no canal: ${interaction.channel}.`,
            ephemeral: true
        });

    },
};