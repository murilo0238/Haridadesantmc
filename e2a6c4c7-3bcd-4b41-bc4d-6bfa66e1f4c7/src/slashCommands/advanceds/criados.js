// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbCoupons = new JsonDatabase({ databasePath: "./databases/dbCoupons.json" });
const dbGifts = new JsonDatabase({ databasePath: "./databases/dbGifts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("criados")
        .setDescription("[🛠/💰] Veja todos os itens cadastrados!")
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

        // row - items registered
        const rowItemsRegistered = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`products`).setLabel(`Produtos`).setEmoji(`⚙`).setStyle(`Secondary`),
                new ButtonBuilder().setCustomId(`coupons`).setLabel(`Cupons`).setEmoji(`⚙`).setStyle(`Secondary`),
                new ButtonBuilder().setCustomId(`outStockProducts`).setLabel(`Produtos sem Estoque`).setEmoji(`⚙`).setStyle(`Secondary`),
                new ButtonBuilder().setCustomId(`giftcards`).setLabel(`GiftCards`).setEmoji(`⚙`).setStyle(`Secondary`),
            );

        // embed - items registered
        const embedItemsRegistered = new EmbedBuilder()
            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
            .setTitle(`${client.user.username} | Criados`)
            .setDescription(`⚙ | Selecione o tipo de item que deseja visualizar.`)
            .setColor(`NotQuiteBlack`);

        // message - items
        await interaction.reply({
            embeds: [embedItemsRegistered],
            components: [rowItemsRegistered]
        }).then(async (msg) => {

            // createMessageComponentCollector - collector
            const filter = (m) => m.user.id == interaction.user.id;
            const collectorItems = msg.createMessageComponentCollector({
                filter: filter,
                time: 600000
            });
            collectorItems.on("collect", async (iItem) => {

                // interaction - id
                const iItemId = iItem.id;

                // products - button
                if (iItem.customId == `products`) {

                    // message - loading
                    await iItem.reply({
                        content: `🔁 | Carregando ...`,
                        ephemeral: true
                    });

                    // object values - items
                    const allItems = await Promise.all(
                        dbProducts.all().map((product) => {

                            // variables with product information
                            const productId = product.ID;
                            const productName = product.data.name;
                            const productPrice = product.data.price;
                            const productStock = product.data.stock;

                            return `**📝 | ID:** ${productId}\n**🌎 | Nome:** ${productName}\n**💸 | Preço:** R$${productPrice}\n**📦 | Estoque:** ${productStock.length}`;
                        })
                    );

                    // no items were found
                    if (allItems <= 0) {
                        await iItem.editReply({
                            content: `❌ | Nenhum produto foi encontrado.`,
                            ephemeral: true
                        });
                        return;
                    };

                    // variables for page control
                    let currentPage = 1;
                    const itemsPerPage = 10;

                    // function to update the message based on the current page
                    async function updateMessagePage(page) {

                        // similar calculations as above to determine skins for the current page
                        const startIndex = (page - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const itemsForPage = allItems.slice(startIndex, endIndex);

                        // creates the embed description with the skins for the current page
                        const description = itemsForPage.join("\n\n");

                        // creates the embed for the current page based on the updated description
                        const embedPage = new EmbedBuilder()
                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                            .setTitle(`${client.user.username} | Produtos`)
                            .setDescription(description)
                            .setColor(`NotQuiteBlack`)
                            .setFooter({ text: `Gerencie as páginas usando os botões abaixo.` });

                        // updates the message with the corresponding embed and navigation buttons
                        await iItem.editReply({
                            content: ``,
                            embeds: [embedPage],
                            components: [createRowPage(page)]
                        });

                    };

                    // function to create the row with the navigation buttons
                    function createRowPage(page) {

                        // row - page
                        const rowPage = new ActionRowBuilder();

                        // total page
                        const totalPage = Math.ceil(allItems.length / itemsPerPage);

                        // do the checks (1)
                        if (page != 1 && page != totalPage) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`),
                            );

                        } else if (allItems.length < (itemsPerPage + 1)) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                            );

                        } else if (page <= 1) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`)
                            );

                        } else {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true),
                            );

                        };

                        // return - rowPage
                        return rowPage;

                    };

                    // calls the function to edit the message
                    await updateMessagePage(currentPage);

                    // createMessageComponentCollector - collector
                    const filter = (m) => m.user.id == interaction.user.id;
                    const collectorItemBts = msg.createMessageComponentCollector({
                        filter: filter,
                        time: 600000
                    });
                    collectorItemBts.on("collect", async (iItemBt) => {

                        // backMax - button - page
                        if (iItemBt.customId == `backMax-${iItemId}` && currentPage > 1) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage = 1;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // back - button - page
                        if (iItemBt.customId == `back-${iItemId}` && currentPage > 1) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage--;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // next - button - page
                        if (iItemBt.customId == `next-${iItemId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage++;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // nextMax - button - page
                        if (iItemBt.customId == `nextMax-${iItemId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // calculates the total number of pages
                            const totalPages = Math.ceil(allItems.length / itemsPerPage);

                            // shrinks the current page
                            currentPage = totalPages;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                    });

                    // end of time - collector
                    collectorItemBts.on("end", async (c, r) => {
                        if (r == "time") {

                            // calculates the total number of pages
                            const totalPages = Math.ceil(allItems.length / itemsPerPage);

                            // message - edit
                            await iItem.editReply({
                                components: [new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${currentPage}/${totalPages}`).setStyle(`Secondary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                                    )
                                ]
                            });

                        };
                    });

                };

                // coupons - button
                if (iItem.customId == `coupons`) {

                    // message - loading
                    await iItem.reply({
                        content: `🔁 | Carregando ...`,
                        ephemeral: true
                    });

                    // object values - items
                    const allItems = await Promise.all(
                        dbCoupons.all().map((coupon) => {

                            // variables with coupon information
                            const couponName = coupon.ID;
                            const couponDiscount = coupon.data.discount;
                            const couponStock = coupon.data.stock;
                            const couponMinimumPurchase = coupon.data.minimumPurchase;

                            // variables with information formatted for coupon use
                            const minimumPurchaseFormatted = couponMinimumPurchase != 0 ? `R$${Number(couponMinimumPurchase).toFixed(2)}` : `Qualquer valor.`;

                            return `**📝 | Nome:** ${couponName}\n**💸 | Desconto:** ${couponDiscount}%\n**🛒 | Valor Mínimo:** ${minimumPurchaseFormatted}\n**📦 | Quantidade:** ${couponStock}`;
                        })
                    );

                    // no items were found
                    if (allItems <= 0) {
                        await iItem.editReply({
                            content: `❌ | Nenhum cupom foi encontrado.`,
                            ephemeral: true
                        });
                        return;
                    };

                    // variables for page control
                    let currentPage = 1;
                    const itemsPerPage = 10;

                    // function to update the message based on the current page
                    async function updateMessagePage(page) {

                        // similar calculations as above to determine skins for the current page
                        const startIndex = (page - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const itemsForPage = allItems.slice(startIndex, endIndex);

                        // creates the embed description with the skins for the current page
                        const description = itemsForPage.join("\n\n");

                        // creates the embed for the current page based on the updated description
                        const embedPage = new EmbedBuilder()
                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                            .setTitle(`${client.user.username} | Cupons`)
                            .setDescription(description)
                            .setColor(`NotQuiteBlack`)
                            .setFooter({ text: `Gerencie as páginas usando os botões abaixo.` });

                        // updates the message with the corresponding embed and navigation buttons
                        await iItem.editReply({
                            content: ``,
                            embeds: [embedPage],
                            components: [createRowPage(page)]
                        });

                    };

                    // function to create the row with the navigation buttons
                    function createRowPage(page) {

                        // row - page
                        const rowPage = new ActionRowBuilder();

                        // total page
                        const totalPage = Math.ceil(allItems.length / itemsPerPage);

                        // do the checks (1)
                        if (page != 1 && page != totalPage) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`),
                            );

                        } else if (allItems.length < (itemsPerPage + 1)) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                            );

                        } else if (page <= 1) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`)
                            );

                        } else {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true),
                            );

                        };

                        // return - rowPage
                        return rowPage;

                    };

                    // calls the function to edit the message
                    await updateMessagePage(currentPage);

                    // createMessageComponentCollector - collector
                    const filter = (m) => m.user.id == interaction.user.id;
                    const collectorItemBts = msg.createMessageComponentCollector({
                        filter: filter,
                        time: 600000
                    });
                    collectorItemBts.on("collect", async (iItemBt) => {

                        // backMax - button - page
                        if (iItemBt.customId == `backMax-${iItemId}` && currentPage > 1) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage = 1;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // back - button - page
                        if (iItemBt.customId == `back-${iItemId}` && currentPage > 1) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage--;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // next - button - page
                        if (iItemBt.customId == `next-${iItemId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage++;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // nextMax - button - page
                        if (iItemBt.customId == `nextMax-${iItemId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // calculates the total number of pages
                            const totalPages = Math.ceil(allItems.length / itemsPerPage);

                            // shrinks the current page
                            currentPage = totalPages;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                    });

                    // end of time - collector
                    collectorItemBts.on("end", async (c, r) => {
                        if (r == "time") {

                            // calculates the total number of pages
                            const totalPages = Math.ceil(allItems.length / itemsPerPage);

                            // message - edit
                            await iItem.editReply({
                                components: [new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${currentPage}/${totalPages}`).setStyle(`Secondary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                                    )
                                ]
                            });

                        };
                    });

                };

                // outStockProducts - button
                if (iItem.customId == `outStockProducts`) {

                    // message - loading
                    await iItem.reply({
                        content: `🔁 | Carregando ...`,
                        ephemeral: true
                    });

                    // object values - items
                    const allItems = await Promise.all(
                        dbProducts.all().filter((product) => product.data.stock.length <= 0)
                            .map((product) => {

                                // variables with product information
                                const productId = product.ID;
                                const productName = product.data.name;
                                const productPrice = product.data.price;
                                const productStock = product.data.stock;

                                return `**📝 | ID:** ${productId}\n**🌎 | Nome:** ${productName}\n**💸 | Preço:** R$${productPrice}\n**📦 | Estoque:** ${productStock.length}`;
                            })
                    );

                    // no items were found
                    if (allItems <= 0) {
                        await iItem.editReply({
                            content: `❌ | Nenhum produto sem estoque foi encontrado.`,
                            ephemeral: true
                        });
                        return;
                    };

                    // variables for page control
                    let currentPage = 1;
                    const itemsPerPage = 10;

                    // function to update the message based on the current page
                    async function updateMessagePage(page) {

                        // similar calculations as above to determine skins for the current page
                        const startIndex = (page - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const itemsForPage = allItems.slice(startIndex, endIndex);

                        // creates the embed description with the skins for the current page
                        const description = itemsForPage.join("\n\n");

                        // creates the embed for the current page based on the updated description
                        const embedPage = new EmbedBuilder()
                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                            .setTitle(`${client.user.username} | Produtos`)
                            .setDescription(description)
                            .setColor(`NotQuiteBlack`)
                            .setFooter({ text: `Gerencie as páginas usando os botões abaixo.` });

                        // updates the message with the corresponding embed and navigation buttons
                        await iItem.editReply({
                            content: ``,
                            embeds: [embedPage],
                            components: [createRowPage(page)]
                        });

                    };

                    // function to create the row with the navigation buttons
                    function createRowPage(page) {

                        // row - page
                        const rowPage = new ActionRowBuilder();

                        // total page
                        const totalPage = Math.ceil(allItems.length / itemsPerPage);

                        // do the checks (1)
                        if (page != 1 && page != totalPage) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`),
                            );

                        } else if (allItems.length < (itemsPerPage + 1)) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                            );

                        } else if (page <= 1) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`)
                            );

                        } else {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true),
                            );

                        };

                        // return - rowPage
                        return rowPage;

                    };

                    // calls the function to edit the message
                    await updateMessagePage(currentPage);

                    // createMessageComponentCollector - collector
                    const filter = (m) => m.user.id == interaction.user.id;
                    const collectorItemBts = msg.createMessageComponentCollector({
                        filter: filter,
                        time: 600000
                    });
                    collectorItemBts.on("collect", async (iItemBt) => {

                        // backMax - button - page
                        if (iItemBt.customId == `backMax-${iItemId}` && currentPage > 1) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage = 1;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // back - button - page
                        if (iItemBt.customId == `back-${iItemId}` && currentPage > 1) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage--;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // next - button - page
                        if (iItemBt.customId == `next-${iItemId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage++;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // nextMax - button - page
                        if (iItemBt.customId == `nextMax-${iItemId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // calculates the total number of pages
                            const totalPages = Math.ceil(allItems.length / itemsPerPage);

                            // shrinks the current page
                            currentPage = totalPages;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                    });

                    // end of time - collector
                    collectorItemBts.on("end", async (c, r) => {
                        if (r == "time") {

                            // calculates the total number of pages
                            const totalPages = Math.ceil(allItems.length / itemsPerPage);

                            // message - edit
                            await iItem.editReply({
                                components: [new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${currentPage}/${totalPages}`).setStyle(`Secondary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                                    )
                                ]
                            });

                        };
                    });

                };

                // giftcards - button
                if (iItem.customId == `giftcards`) {

                    // message - loading
                    await iItem.reply({
                        content: `🔁 | Carregando ...`,
                        ephemeral: true
                    });

                    // object values - items
                    const allItems = await Promise.all(
                        dbGifts.all().map((gift) => {

                            // variables with gift information
                            const giftCode = gift.ID;
                            const giftBalance = gift.data.balance;

                            return `**📝 | Código:** ${giftCode}\n**💸 | Valor:** R$${Number(giftBalance).toFixed(2)}`;
                        })
                    );

                    // no items were found
                    if (allItems <= 0) {
                        await iItem.editReply({
                            content: `❌ | Nenhum gift foi encontrado.`,
                            ephemeral: true
                        });
                        return;
                    };

                    // variables for page control
                    let currentPage = 1;
                    const itemsPerPage = 10;

                    // function to update the message based on the current page
                    async function updateMessagePage(page) {

                        // similar calculations as above to determine skins for the current page
                        const startIndex = (page - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const itemsForPage = allItems.slice(startIndex, endIndex);

                        // creates the embed description with the skins for the current page
                        const description = itemsForPage.join("\n\n");

                        // creates the embed for the current page based on the updated description
                        const embedPage = new EmbedBuilder()
                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                            .setTitle(`${client.user.username} | GiftCards`)
                            .setDescription(description)
                            .setColor(`NotQuiteBlack`)
                            .setFooter({ text: `Gerencie as páginas usando os botões abaixo.` });

                        // updates the message with the corresponding embed and navigation buttons
                        await iItem.editReply({
                            content: ``,
                            embeds: [embedPage],
                            components: [createRowPage(page)]
                        });

                    };

                    // function to create the row with the navigation buttons
                    function createRowPage(page) {

                        // row - page
                        const rowPage = new ActionRowBuilder();

                        // total page
                        const totalPage = Math.ceil(allItems.length / itemsPerPage);

                        // do the checks (1)
                        if (page != 1 && page != totalPage) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`),
                            );

                        } else if (allItems.length < (itemsPerPage + 1)) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                            );

                        } else if (page <= 1) {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`)
                            );

                        } else {

                            // add components
                            rowPage.addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true),
                            );

                        };

                        // return - rowPage
                        return rowPage;

                    };

                    // calls the function to edit the message
                    await updateMessagePage(currentPage);

                    // createMessageComponentCollector - collector
                    const filter = (m) => m.user.id == interaction.user.id;
                    const collectorItemBts = msg.createMessageComponentCollector({
                        filter: filter,
                        time: 600000
                    });
                    collectorItemBts.on("collect", async (iItemBt) => {

                        // backMax - button - page
                        if (iItemBt.customId == `backMax-${iItemId}` && currentPage > 1) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage = 1;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // back - button - page
                        if (iItemBt.customId == `back-${iItemId}` && currentPage > 1) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage--;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // next - button - page
                        if (iItemBt.customId == `next-${iItemId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // shrinks the current page
                            currentPage++;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                        // nextMax - button - page
                        if (iItemBt.customId == `nextMax-${iItemId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                            // deferUpdate - postphone the update
                            await iItemBt.deferUpdate();

                            // calculates the total number of pages
                            const totalPages = Math.ceil(allItems.length / itemsPerPage);

                            // shrinks the current page
                            currentPage = totalPages;

                            // update message by calling function
                            await updateMessagePage(currentPage);

                        };

                    });

                    // end of time - collector
                    collectorItemBts.on("end", async (c, r) => {
                        if (r == "time") {

                            // calculates the total number of pages
                            const totalPages = Math.ceil(allItems.length / itemsPerPage);

                            // message - edit
                            await iItem.editReply({
                                components: [new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`backMax-${iItemId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`back-${iItemId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${currentPage}/${totalPages}`).setStyle(`Secondary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`next-${iItemId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                        new ButtonBuilder().setCustomId(`nextMax-${iItemId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                                    )
                                ]
                            });

                        };
                    });

                };

            });

            // end of time - collector
            collectorItems.on("end", async (c, r) => {
                if (r == "time") {

                    // message - edit
                    await interaction.editReply({
                        content: `⚙ | Use o comando novamente.`,
                        embeds: [],
                        components: []
                    });

                };
            });

        });

    },
};