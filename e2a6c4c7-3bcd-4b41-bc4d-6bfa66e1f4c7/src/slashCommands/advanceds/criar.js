// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// moment - locale
const moment = require("moment");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("criar")
        .setDescription("[🛠/💰] Cadastre um novo produto!")
        .addStringOption(opString => opString
            .setName("id")
            .setDescription("ID do Produto")
            .setMaxLength(25)
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

        // id product
        const idProduct = interaction.options.getString("id").replace(/\s/g, "").toLowerCase();

        // inserted product was found in dbProducts (wio.db)
        if (dbProducts.has(idProduct)) {
            await interaction.reply({
                content: `❌ | ID do produto: **${idProduct}** já existe.`,
                ephemeral: true
            });
            return;
        };

        // arrow the product at dbProducts (wio.db)
        await dbProducts.set(`${idProduct}.id`, idProduct);
        await dbProducts.set(`${idProduct}.name`, `Não configurado(a).`);
        await dbProducts.set(`${idProduct}.description`, "Não configurado(a).");
        await dbProducts.set(`${idProduct}.thumbUrl`, "none");
        await dbProducts.set(`${idProduct}.bannerUrl`, "none");
        await dbProducts.set(`${idProduct}.color`, "none");
        await dbProducts.set(`${idProduct}.price`, "10.00");
        await dbProducts.set(`${idProduct}.role`, "none");
        await dbProducts.set(`${idProduct}.useCoupon`, true);
        await dbProducts.set(`${idProduct}.stock`, []);
        await dbProducts.set(`${idProduct}.notificationUsers`, {});
        await dbProducts.set(`${idProduct}.creationData`, moment());

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
            .setColor(colorP != "none" ? colorP : `NotQuiteBlack`)

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
            content: `✅ | Produto criado com sucesso. Utilize **/config** para gerenciar seu produto!`,
            ephemeral: true
        });

    },
};