// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("rank-produtos")
        .setDescription("[🛠/💰] Veja o rank dos produtos que mais foram vendidos!")
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

        // message - loading
        await interaction.reply({
            content: `🔁 | Carregando ...`
        }).then(async (msg) => {

            // interaction - id
            const iId = interaction.id;

            // object values - items
            const allItems = await Promise.all(
                dbProducts.all().sort((a, b) => b.data.incomeTotal - a.data.incomeTotal)
                    .filter((product) => product.data.incomeTotal > 0.00)
                    .map(async (product, index) => {

                        // variables with profile information
                        const productId = product.ID;
                        const productName = product.data.name;
                        const productIncomeTotal = product.data.incomeTotal;
                        const productSellsTotal = product.data.sellsTotal;

                        // rank - position
                        const productPosition = index + 1;

                        // rank - position - emoji
                        const productPositionEmoji =
                            productPosition == 1 ? `🥇` :
                                productPosition == 2 ? `🥈` :
                                    productPosition == 3 ? `🥉` :
                                        `🏅`;

                        return `${productPositionEmoji} | **__${productPosition}°__** - ${productName} | ${productId}\n💸 | Rendeu: **R$__${Number(productIncomeTotal).toFixed(2)}__**\n🛒 | Total de Vendas: **${Number(productSellsTotal)}**`;
                    })
            );

            // client - clear cache - users
            await client.users.cache.clear();

            // no items were found
            if (allItems <= 0) {
                await interaction.editReply({
                    content: `❌ | Nenhum produto em rank foi encontrado.`,
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
                await interaction.editReply({
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
                        new ButtonBuilder().setCustomId(`backMax-${iId}`).setEmoji(`⏮`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`back-${iId}`).setEmoji(`⬅`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`next-${iId}`).setEmoji(`➡`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`nextMax-${iId}`).setEmoji(`⏭`).setStyle(`Primary`),
                    );

                } else if (allItems.length < (itemsPerPage + 1)) {

                    // add components
                    rowPage.addComponents(
                        new ButtonBuilder().setCustomId(`backMax-${iId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`back-${iId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`next-${iId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`nextMax-${iId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                    );

                } else if (page <= 1) {

                    // add components
                    rowPage.addComponents(
                        new ButtonBuilder().setCustomId(`backMax-${iId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`back-${iId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`next-${iId}`).setEmoji(`➡`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`nextMax-${iId}`).setEmoji(`⏭`).setStyle(`Primary`)
                    );

                } else {

                    // add components
                    rowPage.addComponents(
                        new ButtonBuilder().setCustomId(`backMax-${iId}`).setEmoji(`⏮`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`back-${iId}`).setEmoji(`⬅`).setStyle(`Primary`),
                        new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${page}/${totalPage}`).setStyle(`Secondary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`next-${iId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                        new ButtonBuilder().setCustomId(`nextMax-${iId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true),
                    );

                };

                // return - rowPage
                return rowPage;

            };

            // calls the function to edit the message
            await updateMessagePage(currentPage);

            // createMessageComponentCollector - collector
            const collectorItemBts = msg.createMessageComponentCollector({
                time: 600000
            });
            collectorItemBts.on("collect", async (iItemBt) => {

                // backMax - button - page
                if (iItemBt.customId == `backMax-${iId}` && currentPage > 1) {

                    // deferUpdate - postphone the update
                    await iItemBt.deferUpdate();

                    // shrinks the current page
                    currentPage = 1;

                    // update message by calling function
                    await updateMessagePage(currentPage);

                };

                // back - button - page
                if (iItemBt.customId == `back-${iId}` && currentPage > 1) {

                    // deferUpdate - postphone the update
                    await iItemBt.deferUpdate();

                    // shrinks the current page
                    currentPage--;

                    // update message by calling function
                    await updateMessagePage(currentPage);

                };

                // next - button - page
                if (iItemBt.customId == `next-${iId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

                    // deferUpdate - postphone the update
                    await iItemBt.deferUpdate();

                    // shrinks the current page
                    currentPage++;

                    // update message by calling function
                    await updateMessagePage(currentPage);

                };

                // nextMax - button - page
                if (iItemBt.customId == `nextMax-${iId}` && currentPage < Math.ceil(allItems.length / itemsPerPage)) {

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
                    await interaction.editReply({
                        components: [new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`backMax-${iId}`).setEmoji(`⏮`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`back-${iId}`).setEmoji(`⬅`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`currentAndTotal`).setLabel(`Página ${currentPage}/${totalPages}`).setStyle(`Secondary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`next-${iId}`).setEmoji(`➡`).setStyle(`Primary`).setDisabled(true),
                                new ButtonBuilder().setCustomId(`nextMax-${iId}`).setEmoji(`⏭`).setStyle(`Primary`).setDisabled(true)
                            )
                        ]
                    });

                };
            });

        });

    },
};