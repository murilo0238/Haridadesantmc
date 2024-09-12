// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("set")
        .setDescription("[🛠/💰] Sete a mensagem de compra!")
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

        // variables with product information
        const nameP = await dbProducts.get(`${idProduct}.name`);
        const descriptionP = await dbProducts.get(`${idProduct}.description`);
        const thumbP = await dbProducts.get(`${idProduct}.thumbUrl`);
        const bannerP = await dbProducts.get(`${idProduct}.bannerUrl`);
        const colorP = await dbProducts.get(`${idProduct}.color`);
        const priceP = await dbProducts.get(`${idProduct}.price`);
        const estoqueP = await dbProducts.get(`${idProduct}.stock`);

        // variables with dbConfigs information
        const thumbC = await dbConfigs.get(`images.thumbUrl`);
        const bannerC = await dbConfigs.get(`images.bannerUrl`);
        const colorC = await dbConfigs.get(`embeds.color`);

        // row product
        const rowProduct = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(idProduct).setLabel(`Comprar`).setEmoji(`🛒`).setStyle(`Success`)
            );

        // embed product
        const embedProduct = new EmbedBuilder()
            .setTitle(`${client.user.username} | Produto`)
            .setDescription(`**\`\`\`${descriptionP}\`\`\`\n🌎 | Nome: ${nameP}\n💸 | Preço: R$__${Number(priceP).toFixed(2)}__\n📦 | Estoque: __${estoqueP.length}__**`)
            .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
            .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
            .setColor(colorP != "none" ? colorP : colorC != "none" ? colorC : "NotQuiteBlack");

        // channel - send - product
        const msg = await interaction.channel.send({
            embeds: [embedProduct],
            components: [rowProduct]
        });

        // saves the location of the product purchase panel in dbProducts (WIO.db)
        await dbProducts.set(`${idProduct}.msgLocalization.channelId`, interaction.channel.id);
        await dbProducts.set(`${idProduct}.msgLocalization.messageId`, msg.id);

        // reply - success
        await interaction.reply({
            content: `✅ | Produto setado com sucesso no canal: ${interaction.channel}.`,
            ephemeral: true
        });

    },
};