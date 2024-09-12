// discord.js
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// moment - locale
const moment = require("moment");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbPanels = new JsonDatabase({ databasePath: "./databases/dbPanels.json" });
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("criar-painel")
        .setDescription("[🛠/💰] Cadastre um novo painel de produtos em select menu!")
        .addStringOption(opString => opString
            .setName("id")
            .setDescription("ID do Painel")
            .setMaxLength(25)
            .setRequired(true)
        )
        .addStringOption(opString => opString
            .setName("produto")
            .setDescription("Produto que será adicionado ao painel")
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
        const searchId = interaction.options.getString("produto");
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

        // variables with inserted informations
        const idPanel = interaction.options.getString("id").replace(/\s/g, "").toLowerCase();
        const idProduct = interaction.options.getString("produto");

        // inserted panel was found in dbPanels (wio.db)
        if (dbPanels.has(idPanel)) {
            await interaction.reply({
                content: `❌ | ID do painel: **${idPanel}** já existe.`,
                ephemeral: true
            });
            return;
        };

        // inserted product was not found in dbProducts (wio.db)
        if (!dbProducts.has(idProduct)) {
            await interaction.reply({
                content: `❌ | ID do produto: **${idProduct}** não foi encontrado.`,
                ephemeral: true
            });
            return;
        };

        // set the panel id in dbPanels (wio.db)
        await dbPanels.set(`${idPanel}.id`, idPanel);

        // set the panel embed information in dbPanels (wio.db)
        await dbPanels.set(`${idPanel}.embed.title`, `Não configurado(a).`);
        await dbPanels.set(`${idPanel}.embed.description`, `Não configurado(a).`);
        await dbPanels.set(`${idPanel}.embed.color`, `none`);
        await dbPanels.set(`${idPanel}.embed.bannerUrl`, `none`);
        await dbPanels.set(`${idPanel}.embed.thumbUrl`, `none`);
        await dbPanels.set(`${idPanel}.embed.footer`, `none`);

        // set the select menu information in dbPanels (wio.db)
        await dbPanels.set(`${idPanel}.selectMenu.placeholder`, `Selecione um Produto`);

        // arrow the product to the panel by dbPanels (wio.db)
        await dbPanels.set(`${idPanel}.products.${idProduct}.id`, idProduct);
        await dbPanels.set(`${idPanel}.products.${idProduct}.emoji`, `🛒`);

        // variables with panel embed information
        const titleP = await dbPanels.get(`${idPanel}.embed.title`);
        const descriptionP = await dbPanels.get(`${idPanel}.embed.description`);
        const colorP = await dbPanels.get(`${idPanel}.embed.color`);
        const bannerP = await dbPanels.get(`${idPanel}.embed.bannerUrl`);
        const thumbP = await dbPanels.get(`${idPanel}.embed.thumbUrl`);
        const footerP = await dbPanels.get(`${idPanel}.embed.footer`);

        // variables with panel select menu information
        const placeholderP = await dbPanels.get(`${idPanel}.selectMenu.placeholder`);
        const emojiP = await dbPanels.get(`${idPanel}.products.${idProduct}.emoji`);

        // product in dbProducts (wio.db)
        const product = await dbProducts.get(idProduct);

        // row panel
        const rowPanel = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(idPanel)
                    .setPlaceholder(placeholderP)
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${product.name}`)
                            .setDescription(`Preço: R$${Number(product.price).toFixed(2)} - Estoque: ${product.stock.length}`)
                            .setEmoji(emojiP)
                            .setValue(idProduct)
                    )
            );

        // embed panel
        const embedPanel = new EmbedBuilder()
            .setTitle(titleP)
            .setDescription(descriptionP)
            .setColor(colorP != "none" ? colorP : `NotQuiteBlack`)
            .setThumbnail(thumbP != "none" ? thumbP : "https://sem-img.com")
            .setImage(bannerP != "none" ? bannerP : "https://sem-img.com")
            .setFooter({ text: footerP != "none" ? footerP : " " });

        // channel - send - panel
        const msg = await interaction.channel.send({
            embeds: [embedPanel],
            components: [rowPanel]
        });

        // saves the location of the purchase panel in dbPanels (wio.db)
        await dbPanels.set(`${idPanel}.msgLocalization.channelId`, interaction.channel.id);
        await dbPanels.set(`${idPanel}.msgLocalization.messageId`, msg.id);

        // reply - success
        await interaction.reply({
            content: `✅ | Painel criado com sucesso. Utilize **/config-painel** para gerência-lo!`,
            ephemeral: true
        });

    },
};