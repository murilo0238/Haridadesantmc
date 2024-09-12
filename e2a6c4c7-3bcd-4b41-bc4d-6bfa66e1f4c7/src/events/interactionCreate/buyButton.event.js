// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");

// fs - files
const { writeFile, unlink } = require("node:fs");

// axios - request
const axios = require("axios");

// moment - date and time
const moment = require("moment");

// mercadopago
const { MercadoPagoConfig, Payment, Preference, MerchantOrder } = require("mercadopago");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbSales = new JsonDatabase({ databasePath: "./databases/dbSales.json" });
const dbCoupons = new JsonDatabase({ databasePath: "./databases/dbCoupons.json" });
const dbProfiles = new JsonDatabase({ databasePath: "./databases/dbProfiles.json" });
const dbPurchases = new JsonDatabase({ databasePath: "./databases/dbPurchases.json" });
const dbOpenedCarts = new JsonDatabase({ databasePath: "./databases/dbOpenedCarts.json" });

// event
module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {

        // isButton
        if (interaction.isButton()) {

            // search for the product on dbProducts (wio.db)
            const product = await dbProducts.get(interaction.customId);
            if (product) {

                // product id
                const productId = interaction.customId;

                // variables with product information
                const nameP = product.name;
                const descriptionP = product.description;
                const thumbP = product.thumbUrl;
                const bannerP = product.bannerUrl;
                const colorP = product.color;
                const priceP = product.price;
                const estoqueP = product.stock;

                // variables with dbConfigs information
                const thumbC = await dbConfigs.get(`images.thumbUrl`);
                const bannerC = await dbConfigs.get(`images.bannerUrl`);
                const colorC = await dbConfigs.get(`embeds.color`);

                // embed product
                const embedProduct = new EmbedBuilder()
                    .setTitle(`${client.user.username} | Produto`)
                    .setDescription(`**\`\`\`${descriptionP}\`\`\`\n🌎 | Nome: ${nameP}\n💸 | Preço: R$__${Number(priceP).toFixed(2)}__\n📦 | Estoque: __${estoqueP.length}__**`)
                    .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                    .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                    .setColor(colorP != "none" ? colorP : colorC != "none" ? colorC : "NotQuiteBlack")

                // update the purchase message
                await interaction.message.edit({
                    embeds: [embedProduct]
                });

                // checks if new purchases are enabled
                const statusNewSales = await dbConfigs.get(`newSales`);
                if (!statusNewSales) {

                    // reply - error
                    await interaction.reply({
                        content: `❌ | Não é possível abrir novos carrinhos pois o sistema de vendas está desabilitado.`,
                        ephemeral: true
                    });
                    return;

                };

                // checks if the category is equal to none
                // checks if the category exists
                const categoryCartsId = await dbConfigs.get(`channels.categoryCartsId`);
                if (categoryCartsId == `none`) {

                    // reply - error
                    await interaction.reply({
                        content: `❌ | Configure uma categoria para a abertura de novos carrinhos.`,
                        ephemeral: true
                    });
                    return;

                } else {

                    // search by category on the guild
                    const categoryCartsGuild = interaction.guild.channels.cache.get(categoryCartsId);
                    if (!categoryCartsGuild) {

                        // reply - error
                        await interaction.reply({
                            content: `❌ | A categoria com o ID: **${categoryCartsId}** configurada não foi localizada.`,
                            ephemeral: true
                        });

                        return;
                    };

                };

                // variables with product information by dbProducts (wio.db)
                const amountStock = product.stock.length;

                // product out of stock
                if (amountStock < 1) {

                    // user - interaction
                    const userInteraction = interaction.user;

                    // channel - interaction
                    const channelInteraction = interaction.channel;

                    // reply - out of stock
                    await interaction.reply({
                        content: `⚠ | Este produto está sem estoque. Aguarde um reabastecimento!`,
                        components: [new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`enableNotifications-${productId}`).setLabel(`Ativar Notificações`).setEmoji(`🔔`).setStyle(`Secondary`)
                            )
                        ],
                        ephemeral: true
                    });

                    // createMessageComponentCollector - collector
                    const filter = (i) => i.user.id == interaction.user.id;
                    const collectorOutStock = channelInteraction.createMessageComponentCollector({
                        filter: filter,
                        time: 120000 // 2 minutes
                    });
                    collectorOutStock.on("collect", async (iStock) => {

                        // enableNotifications - button
                        if (iStock.customId == `enableNotifications-${productId}`) {

                            // variable with information about users who will receive notifications
                            const notificationUsers = await dbProducts.get(`${productId}.notificationUsers.${userInteraction.id}`);
                            if (notificationUsers == null) {

                                // add user to receive stock notifications
                                await dbProducts.set(`${productId}.notificationUsers.${userInteraction.id}`, userInteraction.id);

                                // reply - success
                                await iStock.reply({
                                    content: `✅ | Notificações ativadas com sucesso.`,
                                    components: [],
                                    ephemeral: true
                                });

                            } else {

                                // add user to receive stock notifications
                                await dbProducts.delete(`${productId}.notificationUsers.${userInteraction.id}`);

                                // reply - success
                                await iStock.reply({
                                    content: `✅ | As notificações já estavam ativadas anteriormente e foram desativadas. Se desejar reativá-las, basta clicar novamente no botão!`,
                                    components: [],
                                    ephemeral: true
                                });

                            };

                        };

                    });

                    // end of time - collector
                    collectorOutStock.on("end", async (c, r) => {
                        if (r == "time") {

                            // reply - delete
                            await interaction.deleteReply();

                        };
                    });

                    return;
                };

                // existing cart
                const guildChannels = interaction.guild.channels.cache;
                for (const channel of guildChannels.values()) {
                    if (channel.name.startsWith(`🛒・`)) {
                        const cartTopic = channel.topic;
                        if (cartTopic == `carrinho-${interaction.user.id}`) {

                            // checks if the current product page in the channel is at the beginning using dbOpenedCarts (wio.db)
                            const pageChannel = await dbOpenedCarts.get(`${channel.id}.page`);
                            if (pageChannel != `configuring-products-home`) {

                                // reply - it is no longer on the home page
                                await interaction.reply({
                                    embeds: [new EmbedBuilder()
                                        .setDescription(`❌ | Não é possivel adicionar novos produtos em seu carrinho: ${channel}`)
                                        .setColor(`Red`)
                                    ],
                                    components: [new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder()
                                                .setLabel(`Ir para o Carrinho`)
                                                .setEmoji(`🛒`)
                                                .setStyle(`Link`)
                                                .setURL(channel.url)
                                        )
                                    ],
                                    ephemeral: true
                                });

                                return;
                            };

                            // checks if the product already exists in the channel
                            const channelProduct = await dbOpenedCarts.get(`${channel.id}.products.p-${productId}`);
                            if (channelProduct != null) {

                                // reply - existing product in cart
                                await interaction.reply({
                                    embeds: [new EmbedBuilder()
                                        .setDescription(`⚠ | Este produto já está em seu carrinho: ${channel}`)
                                        .setColor(`Red`)
                                    ],
                                    components: [new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder()
                                                .setLabel(`Ir para o Carrinho`)
                                                .setEmoji(`🛒`)
                                                .setStyle(`Link`)
                                                .setURL(channel.url)
                                        )
                                    ],
                                    ephemeral: true
                                });
                                return;

                            } else {

                                // row product (new)
                                const rowNewProduct = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`addOne-${productId}`).setLabel(`+`).setStyle(`Secondary`),
                                        new ButtonBuilder().setCustomId(`editAmount-${productId}`).setEmoji(`✏`).setStyle(`Success`),
                                        new ButtonBuilder().setCustomId(`removeOne-${productId}`).setLabel(`-`).setStyle(`Secondary`),
                                        new ButtonBuilder().setCustomId(`delProduct-${productId}`).setEmoji(`🗑`).setStyle(`Danger`)
                                    );

                                // embed product (new)
                                const embedNewProduct = new EmbedBuilder()
                                    .setDescription(`🌎 | Produto: \`${product.name}\`\n\n📦 | Quantidade: \`1\`\n\n💸 | Preço: \`R$${Number(product.price).toFixed(2)}\`\n\n🛒 | Quantidade disponível: \`${amountStock}\``)
                                    .setColor(`NotQuiteBlack`);

                                // channel - send
                                const msgProduct = await channel.send({
                                    embeds: [embedNewProduct],
                                    components: [rowNewProduct]
                                });

                                // saves product message to dbOpenedCarts (wio.db)
                                await dbOpenedCarts.set(`${channel.id}.products.p-${productId}`, productId);
                                await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.messageId`, msgProduct.id);
                                await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.productId`, productId);
                                await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.productName`, product.name);
                                await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.productPrice`, Number(product.price).toFixed(2));
                                await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.productStock`, amountStock);
                                await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.purchasePrice`, Number(product.price).toFixed(2));
                                await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.purchaseAmount`, 1);

                                // save product coupon in channel to dbOpenedCarts (wio.db)
                                await dbOpenedCarts.set(`${channel.id}.purchaseCoupon.couponId`, `none`);
                                await dbOpenedCarts.set(`${channel.id}.purchaseCoupon.couponDiscount`, `none`);

                                // createMessageComponentCollector - collector
                                const collectorProduct = channel.createMessageComponentCollector({
                                    time: 600000
                                });
                                collectorProduct.on("collect", async (iProduct) => {

                                    // addOne - button
                                    if (iProduct.customId == `addOne-${productId}`) {

                                        // deferUpdate - postphone the update
                                        await iProduct.deferUpdate();

                                        // variables with product cart information by dbOpenedCarts (wio.db)
                                        const purchaseBeforePrice = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`);
                                        const purchaseBeforeAmount = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`);

                                        // product out of stock
                                        if (purchaseBeforeAmount >= amountStock) {
                                            await iProduct.followUp({
                                                content: `⚠ | Você não pode adicionar uma quantia maior do que a disponível.`,
                                                ephemeral: true
                                            });
                                            return;
                                        };

                                        // set the new amount of items when purchasing and the new price in the bOpenedCarts (wio.db)
                                        await dbOpenedCarts.set(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`, Number(purchaseBeforePrice) + Number(product.price));
                                        await dbOpenedCarts.add(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`, 1);

                                        // variables with product cart information by dbOpenedCarts (wio.db)
                                        const purchaseName = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.productName`);
                                        const purchaseAfterPrice = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`);
                                        const purchaseAfterAmount = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`);

                                        // message - product - edit
                                        await iProduct.message.edit({
                                            embeds: [new EmbedBuilder()
                                                .setDescription(`🌎 | Produto: \`${purchaseName}\`\n\n📦 | Quantidade: \`${purchaseAfterAmount}\`\n\n💸 | Preço: \`R$${Number(purchaseAfterPrice).toFixed(2)}\`\n\n🛒 | Quantidade disponível: \`${amountStock}\``)
                                                .setColor(`NotQuiteBlack`)
                                            ]
                                        });

                                    };

                                    // editAmount - button
                                    if (iProduct.customId == `editAmount-${productId}`) {

                                        // variables with product cart information by dbOpenedCarts (wio.db)
                                        const purchaseName = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.productName`);

                                        // create the modal
                                        const modalAmount = new ModalBuilder()
                                            .setCustomId(`modalAmount-${productId}`)
                                            .setTitle(`📦 | ${purchaseName}`)

                                        // creates the components for the modal
                                        const inputAmount = new TextInputBuilder()
                                            .setCustomId('amountNum')
                                            .setLabel(`Quantidade:`)
                                            .setMaxLength(3)
                                            .setPlaceholder(`Exemplo: 10`)
                                            .setRequired(true)
                                            .setStyle(`Paragraph`)

                                        // rows for components
                                        const iAmountNum = new ActionRowBuilder().addComponents(inputAmount);

                                        // add the rows to the modal
                                        modalAmount.addComponents(iAmountNum);

                                        // open the modal
                                        await iProduct.showModal(modalAmount);

                                        // event - interactionCreate
                                        client.once("interactionCreate", async (iModal) => {

                                            // modalAmount - modal
                                            if (iModal.customId == `modalAmount-${productId}`) {

                                                // deferUpdate - postphone the update
                                                await iModal.deferUpdate();

                                                // variables with product information by dbOpenedCarts (wio.db)
                                                const productName = await dbOpenedCarts.get(`${iModal.channel.id}.products.p-${productId}.productName`);
                                                const productPrice = await dbOpenedCarts.get(`${iModal.channel.id}.products.p-${productId}.productPrice`);
                                                const productStock = await dbOpenedCarts.get(`${iModal.channel.id}.products.p-${productId}.productStock`);

                                                // amount num
                                                const amountInserted = iModal.fields.getTextInputValue(`amountNum`);

                                                // checks whether the amount entered is a valid number
                                                if (isNaN(amountInserted)) {
                                                    await iModal.followUp({
                                                        content: `❌ | A quantidade inserida não é um número válido.`,
                                                        ephemeral: true
                                                    });
                                                    return;

                                                } else {

                                                    // verifica se a quantia é menor que 1
                                                    if (amountInserted > productStock) {
                                                        await iModal.followUp({
                                                            content: `⚠ | A quantidade deve ser menor ou igual a **${productStock}**.`,
                                                            ephemeral: true
                                                        });
                                                        return;
                                                    };

                                                    // verifica se a quantia é maior que 5
                                                    if (amountInserted < 1) {
                                                        await iModal.followUp({
                                                            content: `⚠ | A quantidade deve ser maior ou igual a **1**.`,
                                                            ephemeral: true
                                                        });
                                                        return;
                                                    };

                                                };

                                                // set the new amount of items when purchasing and the new price in the bOpenedCarts (wio.db)
                                                await dbOpenedCarts.set(`${iModal.channel.id}.products.p-${productId}.purchasePrice`, Number(productPrice) * Number(amountInserted));
                                                await dbOpenedCarts.set(`${iModal.channel.id}.products.p-${productId}.purchaseAmount`, Number(amountInserted));

                                                // variables with product cart information by dbOpenedCarts (wio.db)
                                                const purchaseAfterPrice = await dbOpenedCarts.get(`${iModal.channel.id}.products.p-${productId}.purchasePrice`);
                                                const purchaseAfterAmount = await dbOpenedCarts.get(`${iModal.channel.id}.products.p-${productId}.purchaseAmount`);

                                                // message - product - edit
                                                await iModal.message.edit({
                                                    embeds: [new EmbedBuilder()
                                                        .setDescription(`🌎 | Produto: \`${productName}\`\n\n📦 | Quantidade: \`${purchaseAfterAmount}\`\n\n💸 | Preço: \`R$${Number(purchaseAfterPrice).toFixed(2)}\`\n\n🛒 | Quantidade disponível: \`${productStock}\``)
                                                        .setColor(`NotQuiteBlack`)
                                                    ]
                                                });

                                            };

                                        });

                                    };

                                    // removeOne - button
                                    if (iProduct.customId == `removeOne-${productId}`) {

                                        // deferUpdate - postphone the update
                                        await iProduct.deferUpdate();

                                        // variables with product cart information by dbOpenedCarts (wio.db)
                                        const purchaseBeforePrice = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`);
                                        const purchaseBeforeAmount = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`);

                                        // product out of stock
                                        if (purchaseBeforeAmount <= 1) {
                                            await iProduct.followUp({
                                                content: `⚠ | Você não pode remover uma quantia menor do que a disponível.`,
                                                ephemeral: true
                                            });
                                            return;
                                        };

                                        // set the new amount of items when purchasing and the new price in the bOpenedCarts (wio.db)
                                        await dbOpenedCarts.set(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`, Number(purchaseBeforePrice) - Number(product.price));
                                        await dbOpenedCarts.substr(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`, 1);

                                        // variables with product cart information by dbOpenedCarts (wio.db)
                                        const purchaseName = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.productName`);
                                        const purchaseAfterPrice = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`);
                                        const purchaseAfterAmount = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`);

                                        // message - product - edit
                                        await iProduct.message.edit({
                                            embeds: [new EmbedBuilder()
                                                .setDescription(`🌎 | Produto: \`${purchaseName}\`\n\n📦 | Quantidade: \`${purchaseAfterAmount}\`\n\n💸 | Preço: \`R$${Number(purchaseAfterPrice).toFixed(2)}\`\n\n🛒 | Quantidade disponível: \`${amountStock}\``)
                                                .setColor(`NotQuiteBlack`)
                                            ]
                                        });

                                    };

                                    // delProduct - button
                                    if (iProduct.customId == `delProduct-${productId}`) {

                                        // deferUpdate - postphone the update
                                        await iProduct.deferUpdate();

                                        // delete the product in dbOpenedCarts (wio.db)
                                        await dbOpenedCarts.delete(`${channel.id}.products.p-${productId}`);

                                        // message - success
                                        await msgProduct.delete();

                                        // stop the collector (collectorProduct)
                                        await collectorProduct.stop();

                                    };

                                    // acceptContinue - button - global
                                    if (iProduct.customId == `acceptContinue`) {

                                        // stop the collector (collectorProduct)
                                        await collectorProduct.stop();

                                    };

                                });

                                // reply - product added in cart
                                await interaction.reply({
                                    embeds: [new EmbedBuilder()
                                        .setDescription(`✅ | Produto adicionado em seu carrinho: ${channel}`)
                                        .setColor(`Green`)
                                    ],
                                    components: [new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder()
                                                .setLabel(`Ir para o Carrinho`)
                                                .setEmoji(`🛒`)
                                                .setStyle(`Link`)
                                                .setURL(channel.url)
                                        )
                                    ],
                                    ephemeral: true
                                });

                            };

                            return;
                        };
                    };
                };

                // reply - waiting
                await interaction.reply({
                    content: `🔁 | Criando o carrinho ...`,
                    ephemeral: true
                });

                // open the cart channel
                await interaction.guild.channels.create({
                    name: `🛒・${interaction.user.username}`,
                    type: 0,
                    parent: categoryCartsId,
                    topic: "carrinho-" + interaction.user.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone,
                            deny: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages
                            ],
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel
                            ],
                            deny: [
                                PermissionFlagsBits.SendMessages
                            ]
                        }
                    ]
                }).then(async (channel) => {

                    // cart creation date
                    const createdDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                    // loop - close the cart within a period of time - home
                    const loopCloseHome = setTimeout(async (t) => {

                        // delete the product in dbOpenedCarts (wio.db)
                        await dbOpenedCarts.delete(channel.id);

                        // delete the channel
                        await channel.delete()
                            .catch((err) => {

                                // 10003 - code
                                if (err.code == 10003) {
                                    return;
                                } else {
                                    console.error(err);
                                    return;
                                };

                            });

                        // log - cart time expired
                        const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                        if (channelLogsPriv) {
                            await channelLogsPriv.send({
                                embeds: [new EmbedBuilder()
                                    .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                    .setTitle(`${client.user.username} | Compra Cancelada`)
                                    .addFields(
                                        { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                        { name: `📜 | Motivo:`, value: `Cancelada por inatividade.` },
                                        { name: `⏰ | Data & Horário:`, value: `${createdDate}` }
                                    )
                                    .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                                    .setColor(`Red`)
                                    .setTimestamp()
                                ]
                            });
                        };

                        // log - cart time expired - user
                        await interaction.user.send({
                            embeds: [new EmbedBuilder()
                                .setTitle(`${client.user.username} | Compra Cancelada`)
                                .setDescription(`Sua compra foi cancelada devido à **inatividade**. Para reabrir o carrinho, clique no botão abaixo.`)
                                .setColor(`Red`)
                                .setTimestamp()
                            ],
                            components: [new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setLabel(`Comprar`).setEmoji(`🛒`).setStyle(`Link`).setURL(`https://discord.com/channels/${interaction.guild.id}/${product.msgLocalization.channelId}`)
                                )
                            ]
                        }).catch((err) => {
                            return;
                        });

                    }, 480000);

                    // row cart
                    const rowCart = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`acceptContinue`).setLabel(`Aceitar e Continuar`).setEmoji(`✅`).setStyle(`Success`),
                            new ButtonBuilder().setCustomId(`viewTerms`).setLabel(`Ler os Termos`).setEmoji(`🔎`).setStyle(`Secondary`),
                            new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                        );

                    // embed cart
                    const embedCart = new EmbedBuilder()
                        .setTitle(`${client.user.username} | Carrinho de Compras`)
                        .setDescription(`📢 | Olá **${interaction.user.username}**, Este é o seu carrinho. Sinta-se à vontade para adicionar mais produtos ou fazer as modificações que achar necessário.\n\n📌 | Lembre-se de ler nossos termos de compra para evitar problemas futuros. Ao prosseguir, você concorda com nossos termos.\n\n🔔 | Quando estiver tudo pronto, aperte o botão abaixo para continuar com sua compra!`)
                        .setColor(`NotQuiteBlack`);

                    // channel - send
                    await channel.send({
                        content: `${interaction.user}`,
                        embeds: [embedCart],
                        components: [rowCart]
                    }).then(async (msgCart) => {

                        // row product (main)
                        const rowMainProduct = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`addOne-${productId}`).setLabel(`+`).setStyle(`Secondary`),
                                new ButtonBuilder().setCustomId(`editAmount-${productId}`).setEmoji(`✏`).setStyle(`Success`),
                                new ButtonBuilder().setCustomId(`removeOne-${productId}`).setLabel(`-`).setStyle(`Secondary`),
                                new ButtonBuilder().setCustomId(`delProduct-${productId}`).setEmoji(`🗑`).setStyle(`Danger`)
                            );

                        // embed product (main)
                        const embedMainProduct = new EmbedBuilder()
                            .setDescription(`🌎 | Produto: \`${product.name}\`\n\n📦 | Quantidade: \`1\`\n\n💸 | Preço: \`R$${Number(product.price).toFixed(2)}\`\n\n🛒 | Quantidade disponível: \`${amountStock}\``)
                            .setColor(`NotQuiteBlack`);

                        // channel - send
                        const msgProduct = await channel.send({
                            embeds: [embedMainProduct],
                            components: [rowMainProduct]
                        });

                        // save product page in channel to dbOpenedCarts (wio.db)
                        await dbOpenedCarts.set(`${channel.id}.page`, `configuring-products-home`);

                        // saves product message to dbOpenedCarts (wio.db)
                        await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.messageId`, msgProduct.id);
                        await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.productId`, productId);
                        await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.productName`, product.name);
                        await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.productPrice`, Number(product.price));
                        await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.productStock`, amountStock);
                        await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.purchasePrice`, Number(product.price));
                        await dbOpenedCarts.set(`${channel.id}.products.p-${productId}.purchaseAmount`, 1);

                        // save product coupon in channel to dbOpenedCarts (wio.db)
                        await dbOpenedCarts.set(`${channel.id}.purchaseCoupon.couponId`, `none`);
                        await dbOpenedCarts.set(`${channel.id}.purchaseCoupon.couponDiscount`, `none`);

                        // createMessageComponentCollector - collector
                        const collectorProduct = channel.createMessageComponentCollector({
                            time: 600000
                        });
                        collectorProduct.on("collect", async (iProduct) => {

                            // addOne - button
                            if (iProduct.customId == `addOne-${productId}`) {

                                // deferUpdate - postphone the update
                                await iProduct.deferUpdate();

                                // variables with product cart information by dbOpenedCarts (wio.db)
                                const purchaseBeforePrice = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`);
                                const purchaseBeforeAmount = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`);

                                // product out of stock
                                if (purchaseBeforeAmount >= amountStock) {
                                    await iProduct.followUp({
                                        content: `⚠ | Você não pode adicionar uma quantia maior do que a disponível.`,
                                        ephemeral: true
                                    });
                                    return;
                                };

                                // set the new amount of items when purchasing and the new price in the bOpenedCarts (wio.db)
                                await dbOpenedCarts.set(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`, Number(purchaseBeforePrice) + Number(product.price));
                                await dbOpenedCarts.add(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`, 1);

                                // variables with product cart information by dbOpenedCarts (wio.db)
                                const purchaseName = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.productName`);
                                const purchaseAfterPrice = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`);
                                const purchaseAfterAmount = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`);

                                // message - product - edit
                                await iProduct.message.edit({
                                    embeds: [new EmbedBuilder()
                                        .setDescription(`🌎 | Produto: \`${purchaseName}\`\n\n📦 | Quantidade: \`${purchaseAfterAmount}\`\n\n💸 | Preço: \`R$${Number(purchaseAfterPrice).toFixed(2)}\`\n\n🛒 | Quantidade disponível: \`${amountStock}\``)
                                        .setColor(`NotQuiteBlack`)
                                    ]
                                });

                            };

                            // editAmount - button
                            if (iProduct.customId == `editAmount-${productId}`) {

                                // variables with product cart information by dbOpenedCarts (wio.db)
                                const purchaseName = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.productName`);

                                // create the modal
                                const modalAmount = new ModalBuilder()
                                    .setCustomId(`modalAmount-${productId}`)
                                    .setTitle(`📦 | ${purchaseName}`)

                                // creates the components for the modal
                                const inputAmount = new TextInputBuilder()
                                    .setCustomId('amountNum')
                                    .setLabel(`Quantidade:`)
                                    .setMaxLength(3)
                                    .setPlaceholder(`Exemplo: 10`)
                                    .setRequired(true)
                                    .setStyle(`Paragraph`)

                                // rows for components
                                const iAmountNum = new ActionRowBuilder().addComponents(inputAmount);

                                // add the rows to the modal
                                modalAmount.addComponents(iAmountNum);

                                // open the modal
                                await iProduct.showModal(modalAmount);

                                // event - interactionCreate
                                client.once("interactionCreate", async (iModal) => {

                                    // modalAmount - modal
                                    if (iModal.customId == `modalAmount-${productId}`) {

                                        // deferUpdate - postphone the update
                                        await iModal.deferUpdate();

                                        // variables with product information by dbOpenedCarts (wio.db)
                                        const productName = await dbOpenedCarts.get(`${iModal.channel.id}.products.p-${productId}.productName`);
                                        const productPrice = await dbOpenedCarts.get(`${iModal.channel.id}.products.p-${productId}.productPrice`);
                                        const productStock = await dbOpenedCarts.get(`${iModal.channel.id}.products.p-${productId}.productStock`);

                                        // amount num
                                        const amountInserted = iModal.fields.getTextInputValue(`amountNum`);

                                        // checks whether the amount entered is a valid number
                                        if (isNaN(amountInserted)) {
                                            await iModal.followUp({
                                                content: `❌ | A quantidade inserida não é um número válido.`,
                                                ephemeral: true
                                            });
                                            return;

                                        } else {

                                            // verifica se a quantia é menor que 1
                                            if (amountInserted > productStock) {
                                                await iModal.followUp({
                                                    content: `⚠ | A quantidade deve ser menor ou igual a **${productStock}**.`,
                                                    ephemeral: true
                                                });
                                                return;
                                            };

                                            // verifica se a quantia é maior que 5
                                            if (amountInserted < 1) {
                                                await iModal.followUp({
                                                    content: `⚠ | A quantidade deve ser maior ou igual a **1**.`,
                                                    ephemeral: true
                                                });
                                                return;
                                            };

                                        };

                                        // set the new amount of items when purchasing and the new price in the bOpenedCarts (wio.db)
                                        await dbOpenedCarts.set(`${iModal.channel.id}.products.p-${productId}.purchasePrice`, Number(productPrice) * Number(amountInserted));
                                        await dbOpenedCarts.set(`${iModal.channel.id}.products.p-${productId}.purchaseAmount`, Number(amountInserted));

                                        // variables with product cart information by dbOpenedCarts (wio.db)
                                        const purchaseAfterPrice = await dbOpenedCarts.get(`${iModal.channel.id}.products.p-${productId}.purchasePrice`);
                                        const purchaseAfterAmount = await dbOpenedCarts.get(`${iModal.channel.id}.products.p-${productId}.purchaseAmount`);

                                        // message - product - edit
                                        await iModal.message.edit({
                                            embeds: [new EmbedBuilder()
                                                .setDescription(`🌎 | Produto: \`${productName}\`\n\n📦 | Quantidade: \`${purchaseAfterAmount}\`\n\n💸 | Preço: \`R$${Number(purchaseAfterPrice).toFixed(2)}\`\n\n🛒 | Quantidade disponível: \`${productStock}\``)
                                                .setColor(`NotQuiteBlack`)
                                            ]
                                        });

                                    };

                                });

                            };

                            // removeOne - button
                            if (iProduct.customId == `removeOne-${productId}`) {

                                // deferUpdate - postphone the update
                                await iProduct.deferUpdate();

                                // variables with product cart information by dbOpenedCarts (wio.db)
                                const purchaseBeforePrice = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`);
                                const purchaseBeforeAmount = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`);

                                // product out of stock
                                if (purchaseBeforeAmount <= 1) {
                                    await iProduct.followUp({
                                        content: `⚠ | Você não pode remover uma quantia menor do que a disponível.`,
                                        ephemeral: true
                                    });
                                    return;
                                };

                                // set the new amount of items when purchasing and the new price in the bOpenedCarts (wio.db)
                                await dbOpenedCarts.set(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`, Number(purchaseBeforePrice) - Number(product.price));
                                await dbOpenedCarts.substr(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`, 1);

                                // variables with product cart information by dbOpenedCarts (wio.db)
                                const purchaseName = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.productName`);
                                const purchaseAfterPrice = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchasePrice`);
                                const purchaseAfterAmount = await dbOpenedCarts.get(`${iProduct.channel.id}.products.p-${productId}.purchaseAmount`);

                                // message - product - edit
                                await iProduct.message.edit({
                                    embeds: [new EmbedBuilder()
                                        .setDescription(`🌎 | Produto: \`${purchaseName}\`\n\n📦 | Quantidade: \`${purchaseAfterAmount}\`\n\n💸 | Preço: \`R$${Number(purchaseAfterPrice).toFixed(2)}\`\n\n🛒 | Quantidade disponível: \`${amountStock}\``)
                                        .setColor(`NotQuiteBlack`)
                                    ]
                                });

                            };

                            // delProduct - button
                            if (iProduct.customId == `delProduct-${productId}`) {

                                // deferUpdate - postphone the update
                                await iProduct.deferUpdate();

                                // delete the product in dbOpenedCarts (wio.db)
                                await dbOpenedCarts.delete(`${channel.id}.products.p-${productId}`);

                                // message - success
                                await msgProduct.delete();

                                // stop the collector (collectorProduct)
                                await collectorProduct.stop();

                            };

                        });

                        // createMessageComponentCollector - collector
                        const filter = (m) => m.user.id == interaction.user.id;
                        const collectorCart1 = channel.createMessageComponentCollector({
                            filter: filter,
                            time: 600000
                        });
                        collectorCart1.on("collect", async (iCart) => {

                            // acceptContinue - button
                            if (iCart.customId == `acceptContinue`) {

                                // deferUpdate - postphone the update
                                await iCart.deferUpdate();

                                // all products
                                const allProductsIds = [];
                                const allProductsNames = [];
                                const allProducts = [];

                                // all items - payment
                                const allItemsPayment = [];

                                // total price of products in the cart
                                let totalPrice = 0;

                                // maps the products in the cart
                                const allCarts = dbOpenedCarts.all()
                                    .filter((channelIdArray) => channelIdArray.ID == channel.id);

                                // promise - products
                                await Promise.all(
                                    allCarts.map(async (product) => {

                                        // get product ids
                                        const productIds = Object.keys(product.data.products);

                                        // separates each product id
                                        for (const pId of productIds) {

                                            // product array
                                            const productDetails = product.data.products[pId];

                                            // variables with product information in the cart by dbOpenedCarts (wio.db)
                                            const productName = productDetails.productName;
                                            const productPrice = productDetails.productPrice;
                                            const purchasePrice = productDetails.purchasePrice;
                                            const purchaseAmount = productDetails.purchaseAmount;

                                            // adds the product price to the total
                                            totalPrice += Number(productDetails.productPrice) * Number(productDetails.purchaseAmount);

                                            // formats the text with product information
                                            const formattedProduct = `🌎 | Produto: \`${productName}\`\n💸 | Preço Unitário: \`R$${Number(productPrice).toFixed(2)}\`\n📦 | Quantidade: \`${Number(purchaseAmount)}\`\n🛒 | Total: \`R$${Number(purchasePrice).toFixed(2)}\``;
                                            allProducts.push(formattedProduct);

                                            // formats the text with product name and quantity
                                            const formattedProductName = `${productName} x${purchaseAmount}`;
                                            allProductsNames.push(formattedProductName);

                                            // pull the product ids into the variable (array)
                                            allProductsIds.push(pId.replace(`p-`, ``));

                                            // pulls the items from the payment date per site to the variable
                                            allItemsPayment.push(
                                                {
                                                    id: pId,
                                                    title: `${productName} - ${interaction.user.username}`,
                                                    picture_url: client.user.avatarURL(),
                                                    quantity: Number(purchaseAmount),
                                                    currency_id: `BRL`,
                                                    unit_price: Number(productPrice)
                                                }
                                            );

                                        };

                                    }),
                                );

                                // cart without products
                                if (allProducts.length < 1) {

                                    // message - error
                                    await iCart.followUp({
                                        content: `❌ | Para continuar com a compra, adicione pelo menos **1** produto a este carrinho.`,
                                        ephemeral: true
                                    });
                                    return;

                                };

                                // clear messages - channel
                                await channel.bulkDelete(50)
                                    .then(async (map) => {

                                        // stop the loop - home
                                        clearTimeout(loopCloseHome);

                                        // loop - close the cart within a period of time - end
                                        const loopCloseEnd = setTimeout(async (t) => {

                                            // delete the product in dbOpenedCarts (wio.db)
                                            await dbOpenedCarts.delete(channel.id);

                                            // delete the channel
                                            await channel.delete()
                                                .catch((err) => {

                                                    // 10003 - code
                                                    if (err.code == 10003) {
                                                        return;
                                                    } else {
                                                        console.error(err);
                                                        return;
                                                    };

                                                });

                                            // log - cart time expired
                                            const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                            if (channelLogsPriv) {
                                                await channelLogsPriv.send({
                                                    embeds: [new EmbedBuilder()
                                                        .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                                        .setTitle(`${client.user.username} | Compra Cancelada`)
                                                        .addFields(
                                                            { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                            { name: `📜 | Motivo:`, value: `Cancelada por inatividade.` },
                                                            { name: `⏰ | Data & Horário:`, value: `${createdDate}` }
                                                        )
                                                        .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                                                        .setColor(`Red`)
                                                        .setTimestamp()
                                                    ]
                                                });
                                            };

                                            // log - cart time expired - user
                                            await interaction.user.send({
                                                embeds: [new EmbedBuilder()
                                                    .setTitle(`${client.user.username} | Compra Cancelada`)
                                                    .setDescription(`Sua compra foi cancelada devido à **inatividade**. Para reabrir o carrinho, clique no botão abaixo.`)
                                                    .setColor(`Red`)
                                                    .setTimestamp()
                                                ],
                                                components: [new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setLabel(`Comprar`).setEmoji(`🛒`).setStyle(`Link`).setURL(`https://discord.com/channels/${iCart.guild.id}/${product.msgLocalization.channelId}`)
                                                    )
                                                ]
                                            }).catch((err) => {
                                                return;
                                            });

                                        }, 600000);

                                        // stop the collector (collectorProduct)
                                        await collectorProduct.stop();

                                        // save new product page in channel to dbOpenedCarts (wio.db)
                                        await dbOpenedCarts.set(`${channel.id}.page`, `configuring-products-end`);

                                        // discount amount and percentage - coupon
                                        let couponValue = `none`;
                                        let couponUsed = `none`;

                                        // variables with information from the coupon used by dbOpenedCarts (wio.db)
                                        const couponId = await dbOpenedCarts.get(`${channel.id}.purchaseCoupon.couponId`);

                                        // row product(s) - resume
                                        const rowResumeProduct = new ActionRowBuilder();

                                        // checks whether the coupon usage status is true or false
                                        const useCouponsStatus = await dbProducts.get(`${productId}.useCoupon`);
                                        if (useCouponsStatus) {

                                            // add the components to the row
                                            rowResumeProduct.addComponents(
                                                new ButtonBuilder().setCustomId(`toPayment`).setLabel(`Ir para o Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                new ButtonBuilder().setCustomId(`addCoupon`).setLabel(`Adicionar Cupom de Desconto`).setEmoji(`🎁`).setStyle(`Primary`),
                                                new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                            );

                                        } else {

                                            // add the components to the row
                                            rowResumeProduct.addComponents(
                                                new ButtonBuilder().setCustomId(`toPayment`).setLabel(`Ir para o Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                new ButtonBuilder().setCustomId(`addCoupon`).setLabel(`Adicionar Cupom de Desconto`).setEmoji(`🎁`).setStyle(`Primary`).setDisabled(true),
                                                new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                            );

                                        };

                                        // embed product(s) - resume
                                        const embedResumeProduct = new EmbedBuilder()
                                            .setTitle(`${client.user.username} | Carrinho de Compras`)
                                            .setDescription(`**${allProducts.join(`\n\n`)}\n\n🛒 | Produtos no Carrinho: \`${allProducts.length}\`\n💸 | Total a Pagar: \`R$${Number(totalPrice).toFixed(2)}\`\n📜 | Cupom Adicionado: \`${couponId == "none" ? `Sem cupom.` : couponId}\`**`)
                                            .setColor(`NotQuiteBlack`);

                                        // message - send
                                        const msgCart2 = await channel.send({
                                            content: `${interaction.user}`,
                                            embeds: [embedResumeProduct],
                                            components: [rowResumeProduct]
                                        });

                                        // createMessageComponentCollector - collector
                                        const filter = (m) => m.user.id == interaction.user.id;
                                        const collectorCart2 = channel.createMessageComponentCollector({
                                            filter: filter,
                                            time: 600000
                                        });
                                        collectorCart2.on("collect", async (iCart2) => {

                                            // toPayment - button
                                            if (iCart2.customId == `toPayment`) {

                                                // deferUpdate - postphone the update
                                                await iCart2.deferUpdate();

                                                // stop the collector (collectorCart2)
                                                await collectorCart2.stop();

                                                // checks if the semi-automatic sales mode is activated
                                                const semiAutoPayment = await dbConfigs.get(`payments.paymentsOptions.semiAuto`);
                                                if (semiAutoPayment) {

                                                    // stop the loop - end
                                                    clearTimeout(loopCloseEnd);

                                                    // row pix - payment
                                                    const rowPixPayment = new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`pixKey`).setLabel(`Chave PIX`).setEmoji(`💠`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`qrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`approvePurchase-${interaction.user.id}-${productId}-${couponValue}-${couponUsed}`).setLabel(`Aprovar Compra`).setEmoji(`✅`).setStyle(`Success`),
                                                            new ButtonBuilder().setCustomId(`cancelPaymentManual-${interaction.user.id}`).setEmoji(`❌`).setStyle(`Danger`)
                                                        );

                                                    // embed pix - payment
                                                    const embedPixPayment = new EmbedBuilder()
                                                        .setTitle(`${client.user.username} | Pagamento`)
                                                        .addFields(
                                                            { name: `🌎 | Produto(s):`, value: allProductsNames.join(`\n`) },
                                                            { name: `💸 | Valor:`, value: `R$${Number(totalPrice).toFixed(2)}` }
                                                        )
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Após realizar o pagamento, envie o comprovante, e aguarde a verificação.` });

                                                    // message - edit
                                                    await msgCart2.edit({
                                                        content: `${interaction.user}`,
                                                        embeds: [embedPixPayment],
                                                        components: [rowPixPayment]
                                                    });

                                                    // defines permissions for the role in the channel
                                                    await channel.permissionOverwrites.edit(interaction.user.id, {
                                                        ViewChannel: true,
                                                        SendMessages: true,
                                                        AttachFiles: true
                                                    });

                                                } else {

                                                    // row product(s) - form of payment
                                                    const rowFormPayment = new ActionRowBuilder()

                                                    // checks if the paid market access token is equal to none
                                                    const tokenMp = await dbConfigs.get(`payments.mpAcessToken`);
                                                    if (tokenMp != `none`) {

                                                        // checks if the token is valid per request (axios)
                                                        await axios.get(`https://api.mercadopago.com/v1/payments/search`, {
                                                            headers: {
                                                                "Authorization": `Bearer ${tokenMp}`
                                                            }
                                                        }).then(async (response) => {

                                                            // variables with status of each payment method
                                                            const pixPayment = await dbConfigs.get(`payments.paymentsOptions.pix`);
                                                            const balancePayment = await dbConfigs.get(`payments.paymentsOptions.balance`);
                                                            const sitePayment = await dbConfigs.get(`payments.paymentsOptions.site`);

                                                            // add the components to the row
                                                            rowFormPayment.addComponents(
                                                                new ButtonBuilder().setCustomId(`pixPayment`).setLabel(`Pix`).setEmoji(`💠`).setStyle(`Primary`).setDisabled(pixPayment ? false : true),
                                                                new ButtonBuilder().setCustomId(`balancePayment`).setLabel(`Saldo`).setEmoji(`💰`).setStyle(`Primary`).setDisabled(balancePayment ? false : true),
                                                                new ButtonBuilder().setCustomId(`sitePayment`).setLabel(`Pagar no Site`).setEmoji(`💠`).setStyle(`Primary`).setDisabled(sitePayment ? false : true),
                                                                new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                                            );

                                                        }).catch(async (err) => {

                                                            // variables with status of each payment method
                                                            const balancePayment = await dbConfigs.get(`payments.paymentsOptions.balance`);

                                                            // add the components to the row
                                                            rowFormPayment.addComponents(
                                                                new ButtonBuilder().setCustomId(`pixPayment`).setLabel(`Pix`).setEmoji(`💠`).setStyle(`Primary`).setDisabled(true),
                                                                new ButtonBuilder().setCustomId(`balancePayment`).setLabel(`Saldo`).setEmoji(`💰`).setStyle(`Primary`).setDisabled(balancePayment ? false : true),
                                                                new ButtonBuilder().setCustomId(`sitePayment`).setLabel(`Pagar no Site`).setEmoji(`💠`).setStyle(`Primary`).setDisabled(true),
                                                                new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                                            );

                                                        });

                                                    } else {

                                                        // variables with status of each payment method
                                                        const balancePayment = await dbConfigs.get(`payments.paymentsOptions.balance`);

                                                        // add the components to the row
                                                        rowFormPayment.addComponents(
                                                            new ButtonBuilder().setCustomId(`pixPayment`).setLabel(`Pix`).setEmoji(`💠`).setStyle(`Primary`).setDisabled(true),
                                                            new ButtonBuilder().setCustomId(`balancePayment`).setLabel(`Saldo`).setEmoji(`💰`).setStyle(`Primary`).setDisabled(balancePayment ? false : true),
                                                            new ButtonBuilder().setCustomId(`sitePayment`).setLabel(`Pagar no Site`).setEmoji(`💠`).setStyle(`Primary`).setDisabled(true),
                                                            new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                                        );

                                                    };

                                                    // embed product(s) - form of payment
                                                    const embedFormPayment = new EmbedBuilder()
                                                        .setTitle(`${client.user.username} | Forma de Pagamento`)
                                                        .addFields(
                                                            { name: `🌎 | Produto(s):`, value: allProductsNames.join(`\n`) },
                                                            { name: `💸 | Total a Pagar:`, value: `R$${Number(totalPrice).toFixed(2)}` }
                                                        )
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Selecione a forma de pagamento utilizando os botões abaixo.` })

                                                    // message - edit
                                                    await msgCart2.edit({
                                                        content: ``,
                                                        embeds: [embedFormPayment],
                                                        components: [rowFormPayment]
                                                    });

                                                    // createMessageComponentCollector - collector
                                                    const filter = (m) => m.user.id == interaction.user.id;
                                                    const collectorCart3 = channel.createMessageComponentCollector({
                                                        filter: filter,
                                                        time: 600000
                                                    });
                                                    collectorCart3.on("collect", async (iCart3) => {

                                                        // pixPayment - button
                                                        if (iCart3.customId == `pixPayment`) {

                                                            // deferUpdate - postphone the update
                                                            await iCart3.deferUpdate();

                                                            // stop the loop - end
                                                            clearTimeout(loopCloseEnd);

                                                            // message - edit
                                                            await msgCart2.edit({
                                                                content: `🔁 | Gerando o pagamento ...`,
                                                                embeds: [],
                                                                components: [],
                                                                ephemeral: true
                                                            });

                                                            // mercadopago - client
                                                            const mpClient = new MercadoPagoConfig({ accessToken: tokenMp });

                                                            // mercadopago - methods
                                                            const mpPayment = new Payment(mpClient);

                                                            // payment details
                                                            const paymentData = {
                                                                transaction_amount: Number(totalPrice),
                                                                description: `${allProductsNames.join(`, `)} - ${interaction.user.username}`,
                                                                payment_method_id: `pix`,
                                                                payer: {
                                                                    email: `cliente@gmail.com`,
                                                                },
                                                            };

                                                            // create the payment
                                                            await mpPayment.create({ body: paymentData })
                                                                .then(async (data) => {

                                                                    // loop - close the cart within a period of time - payment
                                                                    const loopClosePayment = setTimeout(async (t) => {

                                                                        // cancel payment via paid market
                                                                        await mpPayment.cancel({ id: data.id })
                                                                            .catch((err) => {
                                                                                return;
                                                                            });

                                                                        // delete the product in dbOpenedCarts (wio.db)
                                                                        await dbOpenedCarts.delete(channel.id);

                                                                        // delete the channel
                                                                        await channel.delete().catch((err) => {

                                                                            // 10003 - code
                                                                            if (err.code == 10003) {
                                                                                return;
                                                                            } else {
                                                                                console.error(err);
                                                                                return;
                                                                            };

                                                                        });

                                                                        // log - cart time expired - channel
                                                                        const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                        if (channelLogsPriv) {
                                                                            await channelLogsPriv.send({
                                                                                embeds: [new EmbedBuilder()
                                                                                    .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                                                                    .setTitle(`${client.user.username} | Compra Cancelada`)
                                                                                    .addFields(
                                                                                        { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                        { name: `📜 | Motivo:`, value: `Cancelada por inatividade.` },
                                                                                        { name: `⏰ | Data & Horário:`, value: `${createdDate}` }
                                                                                    )
                                                                                    .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                                                                                    .setColor(`Red`)
                                                                                    .setTimestamp()
                                                                                ]
                                                                            });
                                                                        };

                                                                        // log - cart time expired - user
                                                                        await interaction.user.send({
                                                                            embeds: [new EmbedBuilder()
                                                                                .setTitle(`${client.user.username} | Compra Cancelada`)
                                                                                .setDescription(`Sua compra foi cancelada devido à **inatividade**. Para reabrir o carrinho, clique no botão abaixo.`)
                                                                                .setColor(`Red`)
                                                                                .setTimestamp()
                                                                            ],
                                                                            components: [new ActionRowBuilder()
                                                                                .addComponents(
                                                                                    new ButtonBuilder().setLabel(`Comprar`).setEmoji(`🛒`).setStyle(`Link`).setURL(`https://discord.com/channels/${iCart3.guild.id}/${product.msgLocalization.channelId}`)
                                                                                )
                                                                            ]
                                                                        }).catch((err) => {
                                                                            return;
                                                                        });

                                                                    }, 600000);

                                                                    // row pix - payment
                                                                    const rowPixPayment = new ActionRowBuilder()
                                                                        .addComponents(
                                                                            new ButtonBuilder().setCustomId(`copiaCola`).setLabel(`Copia e Cola`).setEmoji(`💠`).setStyle(`Primary`),
                                                                            new ButtonBuilder().setCustomId(`qrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                                                                            new ButtonBuilder().setCustomId(`checkPayment`).setLabel(`Verificar Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                                            new ButtonBuilder().setCustomId(`cancelPayment`).setEmoji(`❌`).setStyle(`Danger`)
                                                                        );

                                                                    // time that payment will expire (moment)
                                                                    const tenMinutes = moment().add(10, `minutes`);
                                                                    const expirationTenMinutes = `<t:${Math.floor(tenMinutes.toDate().getTime() / 1000)}:f> (<t:${Math.floor(tenMinutes.toDate().getTime() / 1000)}:R>)`;

                                                                    // embed pix - payment
                                                                    const embedPixPayment = new EmbedBuilder()
                                                                        .setTitle(`${client.user.username} | Pagamento`)
                                                                        .addFields(
                                                                            { name: `🌎 | Produto(s):`, value: allProductsNames.join(`\n`) },
                                                                            { name: `💸 | Valor:`, value: `R$${Number(totalPrice).toFixed(2)}` },
                                                                            { name: `⏰ | Pagamento expira em:`, value: expirationTenMinutes }
                                                                        )
                                                                        .setColor(`NotQuiteBlack`)
                                                                        .setFooter({ text: `Após realizar o pagamento, clique no botão correspondente para verificar se o pagamento foi aprovado.` });

                                                                    // message - edit
                                                                    await msgCart2.edit({
                                                                        content: `${interaction.user}`,
                                                                        embeds: [embedPixPayment],
                                                                        components: [rowPixPayment]
                                                                    });

                                                                    // createMessageComponentCollector - collector
                                                                    const filter = (m) => m.user.id == interaction.user.id;
                                                                    const collectorPayment = channel.createMessageComponentCollector({
                                                                        filter: filter,
                                                                        time: 600000
                                                                    });
                                                                    collectorPayment.on("collect", async (iPayment) => {

                                                                        // copiaCola - button
                                                                        if (iPayment.customId == `copiaCola`) {

                                                                            // deferUpdate - postphone the update
                                                                            await iPayment.deferUpdate();

                                                                            // copia & cola
                                                                            const codePix = data.point_of_interaction.transaction_data.qr_code;

                                                                            // followUp - copia & cola
                                                                            await iPayment.followUp({
                                                                                content: `${codePix}`,
                                                                                ephemeral: true
                                                                            });

                                                                        };

                                                                        // qrCode - button
                                                                        if (iPayment.customId == `qrCode`) {

                                                                            // deferUpdate - postphone the update
                                                                            await iPayment.deferUpdate();

                                                                            // qr code - attachment
                                                                            const bufferQrCode = Buffer.from(data.point_of_interaction.transaction_data.qr_code_base64, "base64");
                                                                            const qrCodeAttachment = new AttachmentBuilder(bufferQrCode, "payment.png");

                                                                            // followUp - qr code
                                                                            await iPayment.followUp({
                                                                                files: [qrCodeAttachment],
                                                                                ephemeral: true
                                                                            });

                                                                        };

                                                                        // checkPayment - button
                                                                        if (iPayment.customId == `checkPayment`) {

                                                                            // deferUpdate - postphone the update
                                                                            await iPayment.deferUpdate();

                                                                            // payment - status
                                                                            const paymentGet = await mpPayment.get({ id: data.id });
                                                                            const paymentStatus = paymentGet.status;

                                                                            // checks whether the payment status is approved or pending
                                                                            if (paymentStatus == `pending`) {

                                                                                // message - edit
                                                                                await msgCart2.edit({
                                                                                    components: [new ActionRowBuilder()
                                                                                        .addComponents(
                                                                                            new ButtonBuilder().setCustomId(`copiaCola`).setLabel(`Copia e Cola`).setEmoji(`💠`).setStyle(`Primary`),
                                                                                            new ButtonBuilder().setCustomId(`qrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                                                                                            new ButtonBuilder().setCustomId(`checkPayment`).setLabel(`Verificar Pagamento`).setEmoji(`✅`).setStyle(`Success`).setDisabled(true),
                                                                                            new ButtonBuilder().setCustomId(`cancelPayment`).setEmoji(`❌`).setStyle(`Danger`)
                                                                                        )
                                                                                    ]
                                                                                });

                                                                                // loop - edit the message and activate the check payment button - payment
                                                                                setTimeout(async (t) => {

                                                                                    // message - edit
                                                                                    await msgCart2.edit({
                                                                                        components: [new ActionRowBuilder()
                                                                                            .addComponents(
                                                                                                new ButtonBuilder().setCustomId(`copiaCola`).setLabel(`Copia e Cola`).setEmoji(`💠`).setStyle(`Primary`),
                                                                                                new ButtonBuilder().setCustomId(`qrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                                                                                                new ButtonBuilder().setCustomId(`checkPayment`).setLabel(`Verificar Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                                                                new ButtonBuilder().setCustomId(`cancelPayment`).setEmoji(`❌`).setStyle(`Danger`)
                                                                                            )
                                                                                        ]
                                                                                    }).catch((err) => {
                                                                                        return;
                                                                                    });


                                                                                }, 5000);

                                                                                // message - pending
                                                                                await iPayment.followUp({
                                                                                    content: `📝 | O pagamento está **pendente**.`,
                                                                                    ephemeral: true
                                                                                });

                                                                            } else if (paymentStatus == `approved`) {

                                                                                // stop the loop - payment
                                                                                clearTimeout(loopClosePayment);

                                                                                // delete the product in dbOpenedCarts (wio.db)
                                                                                await dbOpenedCarts.delete(channel.id);

                                                                                // clear messages - channel
                                                                                await channel.bulkDelete(3)
                                                                                    .then(async (map) => {

                                                                                        // checks if the role of the product is not equal to 0
                                                                                        const roleProduct = await dbProducts.get(`${productId}.role`);
                                                                                        if (roleProduct != `none`) {

                                                                                            // checks if the user has the position requested in the coupon
                                                                                            const roleGuild = interaction.guild.roles.cache.get(roleProduct);
                                                                                            if (roleGuild) {

                                                                                                // search for user profile on the guild
                                                                                                const memberGuild = interaction.guild.members.cache.get(interaction.user.id) || `\`${roleProduct}\` não encontrado.`;

                                                                                                // set a role on the user
                                                                                                await memberGuild.roles.add(roleGuild)
                                                                                                    .then(async (role) => {

                                                                                                        // message - success
                                                                                                        await channel.send({
                                                                                                            content: `✅ | O cargo: ${roleGuild} foi setado com sucesso.`
                                                                                                        });

                                                                                                    }).catch(async (err) => {

                                                                                                        // message - error
                                                                                                        await channel.send({
                                                                                                            content: `❌ | Erro ao setar o cargo: ${roleGuild}\n\`\`\`js\n${err.name}\`\`\``
                                                                                                        });

                                                                                                    });

                                                                                            };

                                                                                        } else {

                                                                                            // checks if the role of the config is not equal to 0
                                                                                            const roleConfig = await dbConfigs.get(`roles.roleCustomerId`);
                                                                                            if (roleConfig != `none`) {

                                                                                                // checks if the user has the position requested in the coupon
                                                                                                const roleGuild = interaction.guild.roles.cache.get(roleConfig);
                                                                                                if (roleGuild) {

                                                                                                    // search for user profile on the guild
                                                                                                    const memberGuild = interaction.guild.members.cache.get(interaction.user.id) || `\`${roleProduct}\` não encontrado.`;

                                                                                                    // set a role on the user
                                                                                                    await memberGuild.roles.add(roleGuild)
                                                                                                        .then(async (role) => {

                                                                                                            // message - success
                                                                                                            await channel.send({
                                                                                                                content: `✅ | O cargo: ${roleGuild} foi setado com sucesso.`
                                                                                                            });

                                                                                                        }).catch(async (err) => {

                                                                                                            // message - error
                                                                                                            await channel.send({
                                                                                                                content: `❌ | Erro ao setar o cargo: ${roleGuild}\n\`\`\`js\n${err.name}\`\`\``
                                                                                                            });

                                                                                                        });

                                                                                                };
                                                                                            };

                                                                                        };

                                                                                        // set purchase information to dbPurchases (wio.db)
                                                                                        await dbPurchases.set(`${data.id}.id`, data.id);
                                                                                        await dbPurchases.set(`${data.id}.productsIds`, allProductsIds);
                                                                                        await dbPurchases.set(`${data.id}.productsNames`, allProductsNames);
                                                                                        await dbPurchases.set(`${data.id}.pricePaid`, Number(totalPrice).toFixed(2));
                                                                                        await dbPurchases.set(`${data.id}.buyer`, interaction.user.id);
                                                                                        await dbPurchases.set(`${data.id}.date`, moment());

                                                                                        // channel - message - success
                                                                                        await channel.send({
                                                                                            content: `🎉 | Pagamento Aprovado!\n📝 | ID da compra: **${data.id}**`
                                                                                        });

                                                                                        // variables with dbConfigs information
                                                                                        const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                        const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                        // user - message - success
                                                                                        await interaction.user.send({
                                                                                            embeds: [new EmbedBuilder()
                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                .addFields(
                                                                                                    { name: `🛒 | Produto(s) Comprado(s):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                    { name: `📝 | ID da Compra:`, value: `${data.id}` },
                                                                                                    { name: `⭐ | Obrigado por Comprar Conosco!`, value: `**__${interaction.guild.name}__** Agradece a sua Preferência.` },
                                                                                                )
                                                                                                .setThumbnail(thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                .setImage(bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                            ]
                                                                                        }).then(async (msg) => {

                                                                                            // channel - message - success 
                                                                                            const DMBot = await interaction.user.createDM();
                                                                                            await channel.send({
                                                                                                embeds: [new EmbedBuilder()
                                                                                                    .setTitle(`${client.user.username} | Pagamento Aprovado`)
                                                                                                    .setDescription(`${interaction.user} Verifique sua DM.`)
                                                                                                    .setColor(`NotQuiteBlack`)
                                                                                                    .setFooter({ text: `Este carrinho será fechado em 1 minuto.` })
                                                                                                ],
                                                                                                components: [new ActionRowBuilder()
                                                                                                    .addComponents(
                                                                                                        new ButtonBuilder()
                                                                                                            .setLabel(`Atalho para DM`)
                                                                                                            .setEmoji(`🤖`)
                                                                                                            .setStyle(`Link`)
                                                                                                            .setURL(DMBot.url)
                                                                                                    )
                                                                                                ]
                                                                                            });

                                                                                            // promise - products - dm
                                                                                            let itensRemoved = ``;
                                                                                            let itensTotal = 0;
                                                                                            await Promise.all(
                                                                                                allCarts.map(async (product) => {

                                                                                                    // get product ids
                                                                                                    const productIds = Object.keys(product.data.products);

                                                                                                    // separates each product id
                                                                                                    for (const pId of productIds) {

                                                                                                        // product array
                                                                                                        const purchaseDetails = product.data.products[pId];

                                                                                                        // variables with product information in the cart by dbOpenedCarts (wio.db)
                                                                                                        const purchaseName = purchaseDetails.productName;
                                                                                                        const purchasePrice = purchaseDetails.purchasePrice;
                                                                                                        const purchaseAmount = purchaseDetails.purchaseAmount;

                                                                                                        // variables with product information in the cart by dbProducts (wio.db)
                                                                                                        const estoqueP = await dbProducts.get(`${pId.replace(`p-`, ``)}.stock`);

                                                                                                        // product out of stock - error
                                                                                                        if (estoqueP.length < Number(purchaseAmount)) {
                                                                                                            await channel.send({
                                                                                                                embeds: [new EmbedBuilder()
                                                                                                                    .setTitle(`${client.user.username} | Erro na Compra`)
                                                                                                                    .setDescription(`⚠ | Parece que alguém já adquiriu o produto: **${purchaseName}** antes de você, ${interaction.user}. Por favor, abra um ticket para relatar o problema.`)
                                                                                                                    .setColor(`Red`)
                                                                                                                    .setTimestamp()
                                                                                                                ]
                                                                                                            });
                                                                                                            return;
                                                                                                        };

                                                                                                        // saves information in the user profile by dbProfile (wio.db)
                                                                                                        await dbProfiles.add(`${interaction.user.id}.ordersTotal`, 1);
                                                                                                        await dbProfiles.add(`${interaction.user.id}.paidsTotal`, Number(purchasePrice));
                                                                                                        await dbProfiles.set(`${interaction.user.id}.lastPurchase`, moment());

                                                                                                        // saves information in the product by dbProducts (wio.db)
                                                                                                        await dbProducts.add(`${pId.replace(`p-`, ``)}.incomeTotal`, Number(purchasePrice));
                                                                                                        await dbProducts.add(`${pId.replace(`p-`, ``)}.sellsTotal`, Number(purchaseAmount));

                                                                                                        // save new income at dbSales (wio.db)
                                                                                                        await dbSales.add(`${moment().format(`L`)}.requests`, 1);
                                                                                                        await dbSales.add(`${moment().format(`L`)}.receipts`, Number(purchasePrice));

                                                                                                        // removes and picks up product items by dbProducts (wio.db)
                                                                                                        const purchasedItems = await estoqueP.splice(0, Number(purchaseAmount));
                                                                                                        await dbProducts.set(`${pId.replace(`p-`, ``)}.stock`, estoqueP);

                                                                                                        // push variable with items purchased (txt)
                                                                                                        for (let i = 0; i < purchasedItems.length; i++) {
                                                                                                            itensRemoved += `\n📦 | Entrega do Produto: ${purchaseName} - ${i + 1}/${Number(purchaseAmount)}\n${purchasedItems[i]}\n`;
                                                                                                        };

                                                                                                        // add the total number of items in the variable
                                                                                                        itensTotal += Number(purchaseAmount);

                                                                                                    };

                                                                                                }),
                                                                                            );

                                                                                            // set purchase items to dbPurchases (wio.db)
                                                                                            await dbPurchases.set(`${data.id}.productsDelivered`, itensRemoved);

                                                                                            // checks if the number of products is less than or equal to 7
                                                                                            if (Number(itensTotal) <= 7) {

                                                                                                // variables with information from the coupon used
                                                                                                const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                                const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                                // cart payment date
                                                                                                const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                // log - cart time expired - channel
                                                                                                const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                                if (channelLogsPriv) {
                                                                                                    channelLogsPriv.send({
                                                                                                        embeds: [new EmbedBuilder()
                                                                                                            .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                            .addFields(
                                                                                                                { name: `📝 | ID DO PEDIDO:`, value: `\`${data.id}\`` },
                                                                                                                { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                                { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                                { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Pix` },
                                                                                                                { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                                { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`${itensRemoved}\`\`\`` }
                                                                                                            )
                                                                                                            .setColor(`NotQuiteBlack`)
                                                                                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                        ],
                                                                                                        components: [new ActionRowBuilder()
                                                                                                            .addComponents(
                                                                                                                new ButtonBuilder().setCustomId(`refund-${data.id}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`)
                                                                                                            )
                                                                                                        ]
                                                                                                    });
                                                                                                };

                                                                                                // user - message - success - itens
                                                                                                await interaction.user.send({
                                                                                                    content: `${itensRemoved}`
                                                                                                }).catch((async (err) => {

                                                                                                    // file name
                                                                                                    const fileName = `${data.id}.txt`;

                                                                                                    // create the file and add the content
                                                                                                    writeFile(fileName, itensRemoved, (err) => {
                                                                                                        if (err) throw err;
                                                                                                    });

                                                                                                    // create the attachment
                                                                                                    const fileAttachment = new AttachmentBuilder(fileName);

                                                                                                    // user - message - success - itens
                                                                                                    await interaction.user.send({
                                                                                                        files: [fileAttachment]
                                                                                                    }).then((msg) => {

                                                                                                        // delete the file
                                                                                                        unlink(fileName, (err) => {
                                                                                                            if (err) throw err;
                                                                                                        });

                                                                                                    });

                                                                                                }));

                                                                                            } else {

                                                                                                // variables with information from the coupon used
                                                                                                const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                                const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                                // cart payment date
                                                                                                const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                // file name
                                                                                                const fileName = `${data.id}.txt`;

                                                                                                // create the file and add the content
                                                                                                writeFile(fileName, itensRemoved, (err) => {
                                                                                                    if (err) throw err;
                                                                                                });

                                                                                                // create the attachment
                                                                                                const fileAttachment = new AttachmentBuilder(fileName);

                                                                                                // log - product
                                                                                                const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                                if (channelLogsPriv) {
                                                                                                    channelLogsPriv.send({
                                                                                                        embeds: [new EmbedBuilder()
                                                                                                            .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                            .addFields(
                                                                                                                { name: `📝 | ID DO PEDIDO:`, value: `\`${data.id}\`` },
                                                                                                                { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                                { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                                { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Pix` },
                                                                                                                { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                                { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`Produtos no TXT.\`\`\`` }
                                                                                                            )
                                                                                                            .setColor(`NotQuiteBlack`)
                                                                                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                        ],
                                                                                                        components: [new ActionRowBuilder()
                                                                                                            .addComponents(
                                                                                                                new ButtonBuilder().setCustomId(`refund-${data.id}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`)
                                                                                                            )
                                                                                                        ],
                                                                                                        files: [fileAttachment]
                                                                                                    });
                                                                                                };

                                                                                                // user - message - success - itens
                                                                                                await interaction.user.send({
                                                                                                    files: [fileAttachment]
                                                                                                });

                                                                                                // delete the file
                                                                                                unlink(fileName, (err) => {
                                                                                                    if (err) throw err;
                                                                                                });

                                                                                            };

                                                                                            // checks if the public logs channel exists
                                                                                            const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                            if (channelLogsPublic) {

                                                                                                // user - message - rate
                                                                                                await interaction.user.send({
                                                                                                    embeds: [new EmbedBuilder()
                                                                                                        .setTitle(`${client.user.username} | Avaliação`)
                                                                                                        .setDescription(`Se desejar, escolha uma nota abaixo para a venda:`)
                                                                                                        .setColor(`NotQuiteBlack`)
                                                                                                    ],
                                                                                                    components: [new ActionRowBuilder()
                                                                                                        .addComponents(
                                                                                                            new ButtonBuilder().setCustomId(`1`).setLabel(`1`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                            new ButtonBuilder().setCustomId(`2`).setLabel(`2`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                            new ButtonBuilder().setCustomId(`3`).setLabel(`3`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                            new ButtonBuilder().setCustomId(`4`).setLabel(`4`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                            new ButtonBuilder().setCustomId(`5`).setLabel(`5`).setEmoji(`⭐`).setStyle(`Secondary`)
                                                                                                        )
                                                                                                    ]
                                                                                                }).then(async (msgRate) => {

                                                                                                    // createMessageComponentCollector - collector
                                                                                                    const filter = (m) => m.user.id == interaction.user.id;
                                                                                                    const collectorRate = msgRate.createMessageComponentCollector({
                                                                                                        filter: filter,
                                                                                                        time: 60000
                                                                                                    });
                                                                                                    collectorRate.on("collect", async (iRate) => {

                                                                                                        // number of stars chosen - button
                                                                                                        const rateNumber = iRate.customId;
                                                                                                        if (iRate.customId == rateNumber) {

                                                                                                            // create the modal
                                                                                                            const modal = new ModalBuilder()
                                                                                                                .setCustomId(`modalRate`)
                                                                                                                .setTitle(`${`⭐`.repeat(rateNumber)} (${rateNumber})`)

                                                                                                            // creates the components for the modal
                                                                                                            const inputRateTxt = new TextInputBuilder()
                                                                                                                .setCustomId('rateText')
                                                                                                                .setLabel(`Avaliação: (opcional)`)
                                                                                                                .setMaxLength(150)
                                                                                                                .setPlaceholder(`Insira uma breve avaliação aqui ...`)
                                                                                                                .setRequired(false)
                                                                                                                .setStyle(`Paragraph`)

                                                                                                            // rows for components
                                                                                                            const iRateText = new ActionRowBuilder().addComponents(inputRateTxt);

                                                                                                            // add the rows to the modal
                                                                                                            modal.addComponents(iRateText);

                                                                                                            // open the modal
                                                                                                            await iRate.showModal(modal);

                                                                                                            // event - interactionCreate
                                                                                                            client.once("interactionCreate", async (iModal) => {

                                                                                                                // modalRate - modal - submit
                                                                                                                if (iModal.customId == `modalRate`) {

                                                                                                                    // message - delete
                                                                                                                    await msgRate.delete()
                                                                                                                        .catch((err) => {
                                                                                                                            return;
                                                                                                                        });

                                                                                                                    // variables with modal fields
                                                                                                                    const inserterRateText = iModal.fields.getTextInputValue(`rateText`) || `\`Nenhuma Avaliação.\``;

                                                                                                                    // variables with information from the coupon used
                                                                                                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                                    // cart payment date
                                                                                                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                                    // variables with product information
                                                                                                                    const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                                    const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                                    // variables with dbConfigs information
                                                                                                                    const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                                    const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                                    // log - product sale
                                                                                                                    const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                                    if (channelLogsPublic) {
                                                                                                                        await channelLogsPublic.send({
                                                                                                                            content: `${interaction.user}`,
                                                                                                                            embeds: [new EmbedBuilder()
                                                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                                .addFields(
                                                                                                                                    { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                                    { name: `⭐ | AVALIAÇÃO:`, value: `${`⭐`.repeat(rateNumber)} (${rateNumber})\n**__${interaction.user.username}__**: ${inserterRateText}` }
                                                                                                                                )
                                                                                                                                .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                                                .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                                            ]
                                                                                                                        });
                                                                                                                    };

                                                                                                                    // reply - success
                                                                                                                    await iModal.reply({
                                                                                                                        content: `✅ | Avaliação enviada com sucesso!`,
                                                                                                                        ephemeral: true
                                                                                                                    });

                                                                                                                    // stop the collector (collectorRate)
                                                                                                                    await collectorRate.stop();

                                                                                                                };

                                                                                                            });

                                                                                                        };

                                                                                                    });

                                                                                                    // end of time - collector
                                                                                                    collectorRate.on("end", async (c, r) => {
                                                                                                        if (r == "time") {

                                                                                                            // message - delete
                                                                                                            await msgRate.delete()
                                                                                                                .catch((err) => {
                                                                                                                    return;
                                                                                                                });

                                                                                                            // variables with information from the coupon used
                                                                                                            const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                            // cart payment date
                                                                                                            const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                            // variables with product information
                                                                                                            const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                            const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                            // variables with dbConfigs information
                                                                                                            const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                            const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                            // log - product sale
                                                                                                            const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                            if (channelLogsPublic) {
                                                                                                                await channelLogsPublic.send({
                                                                                                                    content: `${interaction.user}`,
                                                                                                                    embeds: [new EmbedBuilder()
                                                                                                                        .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                        .addFields(
                                                                                                                            { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                            { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                            { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                            { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                            { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                            { name: `⭐ | AVALIAÇÃO:`, value: `\`Nenhuma Avaliação.\`` }
                                                                                                                        )
                                                                                                                        .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                                        .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                                        .setColor(`NotQuiteBlack`)
                                                                                                                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                                    ]
                                                                                                                });
                                                                                                            };

                                                                                                        };
                                                                                                    });

                                                                                                });

                                                                                            };

                                                                                            // loop - close the cart - 1 minute
                                                                                            setTimeout(async (t) => {

                                                                                                // delete the channel
                                                                                                await channel.delete()
                                                                                                    .catch((err) => {

                                                                                                        // 10003 - code
                                                                                                        if (err.code == 10003) {
                                                                                                            return;
                                                                                                        } else {
                                                                                                            console.error(err);
                                                                                                            return;
                                                                                                        };

                                                                                                    });

                                                                                            }, 60000);

                                                                                        }).catch(async (err) => {

                                                                                            // channel - message - warning
                                                                                            await channel.send({
                                                                                                content: `❌ | ${interaction.user}, Não foi possivel enviar os itens em sua DM.`
                                                                                            });

                                                                                            // channel - message - success
                                                                                            await channel.send({
                                                                                                embeds: [new EmbedBuilder()
                                                                                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                    .addFields(
                                                                                                        { name: `🛒 | Produto(s) Comprado(s):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                        { name: `📝 | ID da Compra:`, value: `${data.id}` },
                                                                                                        { name: `⭐ | Obrigado por Comprar Conosco!`, value: `**${interaction.guild.name}** Agradece a sua Preferência.` },
                                                                                                    )
                                                                                                    .setThumbnail(thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                    .setImage(bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                    .setColor(`NotQuiteBlack`)
                                                                                                    .setFooter({ text: `Seu(s) Produto(s):` })
                                                                                                ]
                                                                                            });

                                                                                            // promise - products - channel
                                                                                            let itensRemoved = ``;
                                                                                            let itensTotal = 0;
                                                                                            await Promise.all(
                                                                                                allCarts.map(async (product) => {

                                                                                                    // get product ids
                                                                                                    const productIds = Object.keys(product.data.products);

                                                                                                    // separates each product id
                                                                                                    for (const pId of productIds) {

                                                                                                        // product array
                                                                                                        const purchaseDetails = product.data.products[pId];

                                                                                                        // variables with product information in the cart by dbOpenedCarts (wio.db)
                                                                                                        const purchaseName = purchaseDetails.productName;
                                                                                                        const purchasePrice = purchaseDetails.purchasePrice;
                                                                                                        const purchaseAmount = purchaseDetails.purchaseAmount;

                                                                                                        // variables with product information in the cart by dbProducts (wio.db)
                                                                                                        const estoqueP = await dbProducts.get(`${pId.replace(`p-`, ``)}.stock`);

                                                                                                        // product out of stock - error
                                                                                                        if (estoqueP.length < Number(purchaseAmount)) {
                                                                                                            await channel.send({
                                                                                                                embeds: [new EmbedBuilder()
                                                                                                                    .setTitle(`${client.user.username} | Erro na Compra`)
                                                                                                                    .setDescription(`⚠ | Parece que alguém já adquiriu o produto: **${purchaseName}** antes de você, ${interaction.user}. Por favor, abra um ticket para relatar o problema.`)
                                                                                                                    .setColor(`Red`)
                                                                                                                    .setTimestamp()
                                                                                                                ]
                                                                                                            });
                                                                                                            return;
                                                                                                        };

                                                                                                        // saves information in the user profile by dbProfile (wio.db)
                                                                                                        await dbProfiles.add(`${interaction.user.id}.ordersTotal`, 1);
                                                                                                        await dbProfiles.add(`${interaction.user.id}.paidsTotal`, Number(purchasePrice));
                                                                                                        await dbProfiles.set(`${interaction.user.id}.lastPurchase`, moment());

                                                                                                        // saves information in the product by dbProducts (wio.db)
                                                                                                        await dbProducts.add(`${pId.replace(`p-`, ``)}.incomeTotal`, Number(purchasePrice));
                                                                                                        await dbProducts.add(`${pId.replace(`p-`, ``)}.sellsTotal`, Number(purchaseAmount));

                                                                                                        // save new income at dbSales (wio.db)
                                                                                                        await dbSales.add(`${moment().format(`L`)}.requests`, 1);
                                                                                                        await dbSales.add(`${moment().format(`L`)}.receipts`, Number(purchasePrice));

                                                                                                        // removes and picks up product items by dbProducts (wio.db)
                                                                                                        const purchasedItems = await estoqueP.splice(0, Number(purchaseAmount));
                                                                                                        await dbProducts.set(`${pId.replace(`p-`, ``)}.stock`, estoqueP);

                                                                                                        // push variable with items purchased (txt)
                                                                                                        for (let i = 0; i < purchasedItems.length; i++) {
                                                                                                            itensRemoved += `\n📦 | Entrega do Produto: ${purchaseName} - ${i + 1}/${Number(purchaseAmount)}\n${purchasedItems[i]}\n`;
                                                                                                        };

                                                                                                        // add the total number of items in the variable
                                                                                                        itensTotal += Number(purchaseAmount);

                                                                                                    };

                                                                                                }),
                                                                                            );

                                                                                            // checks if the number of products is less than or equal to 7
                                                                                            if (Number(itensTotal) <= 7) {

                                                                                                // variables with information from the coupon used
                                                                                                const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                                const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                                // cart payment date
                                                                                                const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                // log - cart time expired - channel
                                                                                                const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                                if (channelLogsPriv) {
                                                                                                    channelLogsPriv.send({
                                                                                                        embeds: [new EmbedBuilder()
                                                                                                            .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                            .addFields(
                                                                                                                { name: `📝 | ID DO PEDIDO:`, value: `\`${data.id}\`` },
                                                                                                                { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                                { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                                { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Pix` },
                                                                                                                { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                                { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`${itensRemoved}\`\`\`` }
                                                                                                            )
                                                                                                            .setColor(`NotQuiteBlack`)
                                                                                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                        ],
                                                                                                        components: [new ActionRowBuilder()
                                                                                                            .addComponents(
                                                                                                                new ButtonBuilder().setCustomId(`refund-${data.id}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`)
                                                                                                            )
                                                                                                        ]
                                                                                                    });
                                                                                                };

                                                                                                // channel - message - success - itens
                                                                                                await channel.send({
                                                                                                    content: `${itensRemoved}`
                                                                                                }).catch((async (err) => {

                                                                                                    // file name
                                                                                                    const fileName = `${data.id}.txt`;

                                                                                                    // create the file and add the content
                                                                                                    writeFile(fileName, itensRemoved, (err) => {
                                                                                                        if (err) throw err;
                                                                                                    });

                                                                                                    // create the attachment
                                                                                                    const fileAttachment = new AttachmentBuilder(fileName);

                                                                                                    // channel - message - success - itens
                                                                                                    await channel.send({
                                                                                                        files: [fileAttachment]
                                                                                                    }).then((msg) => {

                                                                                                        // delete the file
                                                                                                        unlink(fileName, (err) => {
                                                                                                            if (err) throw err;
                                                                                                        });

                                                                                                    });

                                                                                                }));

                                                                                            } else {

                                                                                                // variables with information from the coupon used
                                                                                                const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                                const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                                // cart payment date
                                                                                                const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                // file name
                                                                                                const fileName = `${data.id}.txt`;

                                                                                                // create the file and add the content
                                                                                                writeFile(fileName, itensRemoved, (err) => {
                                                                                                    if (err) throw err;
                                                                                                });

                                                                                                // create the attachment
                                                                                                const fileAttachment = new AttachmentBuilder(fileName);

                                                                                                // log - product
                                                                                                const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                                if (channelLogsPriv) {
                                                                                                    channelLogsPriv.send({
                                                                                                        embeds: [new EmbedBuilder()
                                                                                                            .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                            .addFields(
                                                                                                                { name: `📝 | ID DO PEDIDO:`, value: `\`${data.id}\`` },
                                                                                                                { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                                { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                                { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Pix` },
                                                                                                                { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                                { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`Produtos no TXT.\`\`\`` }
                                                                                                            )
                                                                                                            .setColor(`NotQuiteBlack`)
                                                                                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                        ],
                                                                                                        components: [new ActionRowBuilder()
                                                                                                            .addComponents(
                                                                                                                new ButtonBuilder().setCustomId(`refund-${data.id}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`)
                                                                                                            )
                                                                                                        ],
                                                                                                        files: [fileAttachment]
                                                                                                    });
                                                                                                };

                                                                                                // channel - message - success - itens
                                                                                                await channel.send({
                                                                                                    files: [fileAttachment]
                                                                                                });

                                                                                                // delete the file
                                                                                                unlink(fileName, (err) => {
                                                                                                    if (err) throw err;
                                                                                                });

                                                                                            };

                                                                                            // checks if the public logs channel exists
                                                                                            const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                            if (channelLogsPublic) {

                                                                                                // channel - message - rate
                                                                                                await channel.send({
                                                                                                    embeds: [new EmbedBuilder()
                                                                                                        .setTitle(`${client.user.username} | Avaliação`)
                                                                                                        .setDescription(`Se desejar, escolha uma nota abaixo para a venda:`)
                                                                                                        .setColor(`NotQuiteBlack`)
                                                                                                    ],
                                                                                                    components: [new ActionRowBuilder()
                                                                                                        .addComponents(
                                                                                                            new ButtonBuilder().setCustomId(`1`).setLabel(`1`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                            new ButtonBuilder().setCustomId(`2`).setLabel(`2`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                            new ButtonBuilder().setCustomId(`3`).setLabel(`3`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                            new ButtonBuilder().setCustomId(`4`).setLabel(`4`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                            new ButtonBuilder().setCustomId(`5`).setLabel(`5`).setEmoji(`⭐`).setStyle(`Secondary`)
                                                                                                        )
                                                                                                    ]
                                                                                                }).then(async (msgRate) => {

                                                                                                    // createMessageComponentCollector - collector
                                                                                                    const filter = (m) => m.user.id == interaction.user.id;
                                                                                                    const collectorRate = msgRate.createMessageComponentCollector({
                                                                                                        filter: filter,
                                                                                                        time: 60000
                                                                                                    });
                                                                                                    collectorRate.on("collect", async (iRate) => {

                                                                                                        // number of stars chosen - button
                                                                                                        const rateNumber = iRate.customId;
                                                                                                        if (iRate.customId == rateNumber) {

                                                                                                            // create the modal
                                                                                                            const modal = new ModalBuilder()
                                                                                                                .setCustomId(`modalRate`)
                                                                                                                .setTitle(`${`⭐`.repeat(rateNumber)} (${rateNumber})`)

                                                                                                            // creates the components for the modal
                                                                                                            const inputRateTxt = new TextInputBuilder()
                                                                                                                .setCustomId('rateText')
                                                                                                                .setLabel(`Avaliação: (opcional)`)
                                                                                                                .setMaxLength(150)
                                                                                                                .setPlaceholder(`Insira uma breve avaliação aqui ...`)
                                                                                                                .setRequired(false)
                                                                                                                .setStyle(`Paragraph`)

                                                                                                            // rows for components
                                                                                                            const iRateText = new ActionRowBuilder().addComponents(inputRateTxt);

                                                                                                            // add the rows to the modal
                                                                                                            modal.addComponents(iRateText);

                                                                                                            // open the modal
                                                                                                            await iRate.showModal(modal);

                                                                                                            // event - interactionCreate
                                                                                                            client.once("interactionCreate", async (iModal) => {

                                                                                                                // modalRate - modal - submit
                                                                                                                if (iModal.customId == `modalRate`) {

                                                                                                                    // message - delete
                                                                                                                    await msgRate.delete()
                                                                                                                        .catch((err) => {
                                                                                                                            return;
                                                                                                                        });

                                                                                                                    // variables with modal fields
                                                                                                                    const inserterRateText = iModal.fields.getTextInputValue(`rateText`) || `\`Nenhuma Avaliação.\``;

                                                                                                                    // variables with information from the coupon used
                                                                                                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                                    // cart payment date
                                                                                                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                                    // variables with product information
                                                                                                                    const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                                    const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                                    // variables with dbConfigs information
                                                                                                                    const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                                    const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                                    // log - product sale
                                                                                                                    const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                                    if (channelLogsPublic) {
                                                                                                                        await channelLogsPublic.send({
                                                                                                                            content: `${interaction.user}`,
                                                                                                                            embeds: [new EmbedBuilder()
                                                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                                .addFields(
                                                                                                                                    { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                                    { name: `⭐ | AVALIAÇÃO:`, value: `${`⭐`.repeat(rateNumber)} (${rateNumber})\n**__${interaction.user.username}__**: ${inserterRateText}` }
                                                                                                                                )
                                                                                                                                .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                                                .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                                            ]
                                                                                                                        });
                                                                                                                    };

                                                                                                                    // reply - success
                                                                                                                    await iModal.reply({
                                                                                                                        content: `✅ | Avaliação enviada com sucesso!`,
                                                                                                                        ephemeral: true
                                                                                                                    });

                                                                                                                    // stop the collector (collectorRate)
                                                                                                                    await collectorRate.stop();

                                                                                                                };

                                                                                                            });

                                                                                                        };

                                                                                                    });

                                                                                                    // end of time - collector
                                                                                                    collectorRate.on("end", async (c, r) => {
                                                                                                        if (r == "time") {

                                                                                                            // message - delete
                                                                                                            await msgRate.delete()
                                                                                                                .catch((err) => {
                                                                                                                    return;
                                                                                                                });

                                                                                                            // variables with information from the coupon used
                                                                                                            const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                            // cart payment date
                                                                                                            const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                            // variables with product information
                                                                                                            const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                            const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                            // variables with dbConfigs information
                                                                                                            const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                            const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                            // log - product sale
                                                                                                            const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                            if (channelLogsPublic) {
                                                                                                                await channelLogsPublic.send({
                                                                                                                    content: `${interaction.user}`,
                                                                                                                    embeds: [new EmbedBuilder()
                                                                                                                        .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                        .addFields(
                                                                                                                            { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                            { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                            { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                            { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                            { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                            { name: `⭐ | AVALIAÇÃO:`, value: `\`Nenhuma Avaliação.\`` }
                                                                                                                        )
                                                                                                                        .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                                        .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                                        .setColor(`NotQuiteBlack`)
                                                                                                                        .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                                    ]
                                                                                                                });
                                                                                                            };

                                                                                                        };
                                                                                                    });

                                                                                                });

                                                                                            };

                                                                                            // loop - close the cart - 10 minutes
                                                                                            setTimeout(async (t) => {

                                                                                                // delete the channel
                                                                                                await channel.delete()
                                                                                                    .catch((err) => {

                                                                                                        // 10003 - code
                                                                                                        if (err.code == 10003) {
                                                                                                            return;
                                                                                                        } else {
                                                                                                            console.error(err);
                                                                                                            return;
                                                                                                        };

                                                                                                    });

                                                                                            }, 600000);

                                                                                        });

                                                                                    });

                                                                                // promise - products
                                                                                await Promise.all(
                                                                                    allCarts.map(async (product) => {

                                                                                        // get product ids
                                                                                        const productIds = Object.keys(product.data.products);

                                                                                        // separates each product id
                                                                                        for (const pId of productIds) {

                                                                                            // get array with product information
                                                                                            const productNew = await dbProducts.get(pId.replace(`p-`, ``));

                                                                                            // variables with message/channel ids by dbProducts (wio.db)
                                                                                            const channelId = productNew.msgLocalization.channelId;
                                                                                            const messageId = productNew.msgLocalization.messageId;

                                                                                            // message channel
                                                                                            const channelMsg = await interaction.guild.channels.cache.get(channelId);

                                                                                            // purchase message
                                                                                            const msgFetched = await channelMsg.messages.cache.get(messageId);

                                                                                            // variables with product information
                                                                                            const nameP = productNew.name;
                                                                                            const descriptionP = productNew.description;
                                                                                            const thumbP = productNew.thumbUrl;
                                                                                            const bannerP = productNew.bannerUrl;
                                                                                            const colorP = productNew.color;
                                                                                            const priceP = productNew.price;
                                                                                            const estoqueP = productNew.stock;

                                                                                            // variables with dbConfigs information
                                                                                            const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                            const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                            // embed product
                                                                                            const embedProduct = new EmbedBuilder()
                                                                                                .setTitle(`${client.user.username} | Produto`)
                                                                                                .setDescription(`**\`\`\`${descriptionP}\`\`\`\n🌎 | Nome: ${nameP}\n💸 | Preço: R$__${Number(priceP).toFixed(2)}__\n📦 | Estoque: __${estoqueP.length}__**`)
                                                                                                .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                .setColor(colorP != "none" ? colorP : `NotQuiteBlack`)

                                                                                            // update the purchase message (msgFetched)
                                                                                            await msgFetched.edit({
                                                                                                embeds: [embedProduct]
                                                                                            }).catch((err) => {
                                                                                                return;
                                                                                            });

                                                                                        };

                                                                                    }),
                                                                                );

                                                                            };

                                                                        };

                                                                        // cancelPayment - button
                                                                        if (iPayment.customId == `cancelPayment`) {

                                                                            // deferUpdate - postphone the update
                                                                            await iPayment.deferUpdate();

                                                                            // cancel payment via paid market
                                                                            await mpPayment.cancel({ id: data.id })
                                                                                .catch((err) => {
                                                                                    return;
                                                                                });

                                                                            // stop the loop - payment
                                                                            clearTimeout(loopClosePayment);

                                                                            // delete the product in dbOpenedCarts (wio.db)
                                                                            await dbOpenedCarts.delete(channel.id);

                                                                            // delete the channel
                                                                            await channel.delete()
                                                                                .catch((err) => {

                                                                                    // 10003 - code
                                                                                    if (err.code == 10003) {
                                                                                        return;
                                                                                    } else {
                                                                                        console.error(err);
                                                                                        return;
                                                                                    };

                                                                                });

                                                                            // log - closed cart
                                                                            const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                            if (channelLogsPriv) {
                                                                                await channelLogsPriv.send({
                                                                                    embeds: [new EmbedBuilder()
                                                                                        .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                                                                        .setTitle(`${client.user.username} | Compra Cancelada`)
                                                                                        .addFields(
                                                                                            { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                            { name: `📜 | Motivo:`, value: `Cancelada pelo comprador.` },
                                                                                            { name: `⏰ | Data & Horário:`, value: `${createdDate}` }
                                                                                        )
                                                                                        .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                                                                                        .setColor(`Red`)
                                                                                        .setTimestamp()
                                                                                    ]
                                                                                });
                                                                            };

                                                                            // stop the collector (collectorPayment)
                                                                            await collectorPayment.stop();

                                                                        };

                                                                    });

                                                                    // stop the collector (collectorCart3)
                                                                    await collectorCart3.stop();

                                                                }).catch(async (err) => {

                                                                    // message - edit - error
                                                                    await msgCart2.edit({
                                                                        content: `❌ | Ocorreu um erro ao gerar o pagamento.`,
                                                                        embeds: [],
                                                                        components: [],
                                                                        ephemeral: true
                                                                    });

                                                                    // loop - close the cart - 15 seconds
                                                                    setTimeout(async (t) => {

                                                                        // delete the channel
                                                                        await channel.delete()
                                                                            .catch((err) => {

                                                                                // 10003 - code
                                                                                if (err.code == 10003) {
                                                                                    return;
                                                                                } else {
                                                                                    console.error(err);
                                                                                    return;
                                                                                };

                                                                            });

                                                                    }, 10000);

                                                                    // delete the product in dbOpenedCarts (wio.db)
                                                                    await dbOpenedCarts.delete(channel.id);

                                                                    // log - error
                                                                    await console.error(err);

                                                                });

                                                        };

                                                        // balancePayment - button
                                                        if (iCart3.customId == `balancePayment`) {

                                                            // deferUpdate - postphone the update
                                                            await iCart3.deferUpdate();

                                                            // variables with user information
                                                            const userBalance = await dbProfiles.get(`${interaction.user.id}.balance`) || 0;

                                                            // user without balance
                                                            if (Number(userBalance) == 0) {
                                                                await iCart3.followUp({
                                                                    content: `❌ | Você não tem saldo disponível para realizar o pagamento usando este meio.`,
                                                                    ephemeral: true
                                                                });
                                                                return;
                                                            };

                                                            // row balance - payment
                                                            const rowBalancePayment = new ActionRowBuilder()
                                                                .addComponents(
                                                                    new ButtonBuilder().setCustomId(`buyBalance`).setLabel(`Pagar`).setEmoji(`✅`).setStyle(`Success`),
                                                                    new ButtonBuilder().setCustomId(`previousPageBalance`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                                                );

                                                            // embed balance - payment
                                                            const embedBalancePayment = new EmbedBuilder()
                                                                .setTitle(`${client.user.username} | Pagamento`)
                                                                .setDescription(`🎁 | Você deseja realizar o pagamento do(s) produto(s): **${allProductsNames.join(`, `)}** no valor de **R$__${Number(totalPrice).toFixed(2)}__** utilizando seu saldo de **R$__${Number(userBalance).toFixed(2)}__**?`)
                                                                .setColor(`NotQuiteBlack`)
                                                                .setFooter({ text: `Após realizar o pagamento, o prazo de entrega é de no máximo 1 minuto.` });

                                                            // message - edit
                                                            await msgCart2.edit({
                                                                content: `${interaction.user}`,
                                                                embeds: [embedBalancePayment],
                                                                components: [rowBalancePayment]
                                                            });

                                                            // createMessageComponentCollector - collector
                                                            const filter = (m) => m.user.id == interaction.user.id;
                                                            const collectorBalance = channel.createMessageComponentCollector({
                                                                filter: filter,
                                                                time: 600000
                                                            });
                                                            collectorBalance.on("collect", async (iBalance) => {

                                                                // buyBalance - button
                                                                if (iBalance.customId == `buyBalance`) {

                                                                    // deferUpdate - postphone the update
                                                                    await iBalance.deferUpdate();

                                                                    // user without balance
                                                                    if (Number(userBalance) < Number(totalPrice)) {

                                                                        // message - edit
                                                                        await msgCart2.edit({
                                                                            content: ``,
                                                                            embeds: [embedFormPayment],
                                                                            components: [rowFormPayment]
                                                                        });

                                                                        // message - error
                                                                        await iBalance.followUp({
                                                                            content: `❌ | Para realizar esta compra, é necessário possuir um saldo de **R$__${Number(totalPrice).toFixed(2)}__**. No momento, há apenas **R$__${Number(userBalance).toFixed(2)}__** disponíveis em sua conta.`,
                                                                            ephemeral: true
                                                                        });

                                                                        // stop the collector (collectorBalance)
                                                                        await collectorBalance.stop();

                                                                        return;
                                                                    };

                                                                    // stop the loop - end
                                                                    clearTimeout(loopCloseEnd);

                                                                    // removes the used amount from the user's balance
                                                                    const pricePaid = Number(userBalance).toFixed(2) - Number(totalPrice).toFixed(2);
                                                                    await dbProfiles.set(`${interaction.user.id}.balance`, pricePaid);

                                                                    // delete the product in dbOpenedCarts (wio.db)
                                                                    await dbOpenedCarts.delete(channel.id);

                                                                    // clear messages - channel
                                                                    await channel.bulkDelete(3)
                                                                        .then(async (map) => {

                                                                            // generates a random ID for purchases via balance
                                                                            const dataBalanceId = Math.floor(Math.random() * 900000000) + 100000000;

                                                                            // checks if the role of the product is not equal to 0
                                                                            const roleProduct = await dbProducts.get(`${productId}.role`);
                                                                            if (roleProduct != `none`) {

                                                                                // checks if the user has the position requested in the coupon
                                                                                const roleGuild = interaction.guild.roles.cache.get(roleProduct);
                                                                                if (roleGuild) {

                                                                                    // search for user profile on the guild
                                                                                    const memberGuild = interaction.guild.members.cache.get(interaction.user.id) || `\`${roleProduct}\` não encontrado.`;

                                                                                    // set a role on the user
                                                                                    await memberGuild.roles.add(roleGuild)
                                                                                        .then(async (role) => {

                                                                                            // message - success
                                                                                            await channel.send({
                                                                                                content: `✅ | O cargo: ${roleGuild} foi setado com sucesso.`
                                                                                            });

                                                                                        }).catch(async (err) => {

                                                                                            // message - error
                                                                                            await channel.send({
                                                                                                content: `❌ | Erro ao setar o cargo: ${roleGuild}\n\`\`\`js\n${err.name}\`\`\``
                                                                                            });

                                                                                        });

                                                                                };

                                                                            } else {

                                                                                // checks if the role of the config is not equal to 0
                                                                                const roleConfig = await dbConfigs.get(`roles.roleCustomerId`);
                                                                                if (roleConfig != `none`) {

                                                                                    // checks if the user has the position requested in the coupon
                                                                                    const roleGuild = interaction.guild.roles.cache.get(roleConfig);
                                                                                    if (roleGuild) {

                                                                                        // search for user profile on the guild
                                                                                        const memberGuild = interaction.guild.members.cache.get(interaction.user.id);

                                                                                        // set a role on the user
                                                                                        await memberGuild.roles.add(roleGuild)
                                                                                            .then(async (role) => {

                                                                                                // message - success
                                                                                                await channel.send({
                                                                                                    content: `✅ | O cargo: ${roleGuild || `\`${roleProduct}\` não encontrado.`} foi setado com sucesso.`
                                                                                                });

                                                                                            }).catch(async (err) => {

                                                                                                // message - error
                                                                                                await channel.send({
                                                                                                    content: `❌ | Erro ao setar o cargo: ${roleGuild || `\`${roleProduct}\` não encontrado.`}\n\`\`\`js\n${err.name}\`\`\``
                                                                                                });

                                                                                            });

                                                                                    };

                                                                                };

                                                                            };

                                                                            // set purchase information to dbPurchases (wio.db)
                                                                            await dbPurchases.set(`${dataBalanceId}.id`, dataBalanceId);
                                                                            await dbPurchases.set(`${dataBalanceId}.productsIds`, allProductsIds);
                                                                            await dbPurchases.set(`${dataBalanceId}.productsNames`, allProductsNames);
                                                                            await dbPurchases.set(`${dataBalanceId}.pricePaid`, Number(totalPrice).toFixed(2));
                                                                            await dbPurchases.set(`${dataBalanceId}.buyer`, interaction.user.id);
                                                                            await dbPurchases.set(`${dataBalanceId}.date`, moment());

                                                                            // channel - message - success
                                                                            await channel.send({
                                                                                content: `🎉 | Pagamento Aprovado!\n📝 | ID da compra: **${dataBalanceId}**`
                                                                            });

                                                                            // variables with dbConfigs information
                                                                            const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                            const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                            // user - message - success
                                                                            await interaction.user.send({
                                                                                embeds: [new EmbedBuilder()
                                                                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                    .addFields(
                                                                                        { name: `🛒 | Produto(s) Comprado(s):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                        { name: `📝 | ID da Compra:`, value: `${dataBalanceId}` },
                                                                                        { name: `⭐ | Obrigado por Comprar Conosco!`, value: `**__${interaction.guild.name}__** Agradece a sua Preferência.` },
                                                                                    )
                                                                                    .setThumbnail(thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                    .setImage(bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                    .setColor(`NotQuiteBlack`)
                                                                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                ]
                                                                            }).then(async (msg) => {

                                                                                // channel - message - success 
                                                                                const DMBot = await interaction.user.createDM();
                                                                                await channel.send({
                                                                                    embeds: [new EmbedBuilder()
                                                                                        .setTitle(`${client.user.username} | Pagamento Aprovado`)
                                                                                        .setDescription(`${interaction.user} Verifique sua DM.`)
                                                                                        .setColor(`NotQuiteBlack`)
                                                                                        .setFooter({ text: `Este carrinho será fechado em 1 minuto.` })
                                                                                    ],
                                                                                    components: [new ActionRowBuilder()
                                                                                        .addComponents(
                                                                                            new ButtonBuilder()
                                                                                                .setLabel(`Atalho para DM`)
                                                                                                .setEmoji(`🤖`)
                                                                                                .setStyle(`Link`)
                                                                                                .setURL(DMBot.url)
                                                                                        )
                                                                                    ]
                                                                                });

                                                                                // promise - products - dm
                                                                                let itensRemoved = ``;
                                                                                let itensTotal = 0;
                                                                                await Promise.all(
                                                                                    allCarts.map(async (product) => {

                                                                                        // get product ids
                                                                                        const productIds = Object.keys(product.data.products);

                                                                                        // separates each product id
                                                                                        for (const pId of productIds) {

                                                                                            // product array
                                                                                            const purchaseDetails = product.data.products[pId];

                                                                                            // variables with product information in the cart by dbOpenedCarts (wio.db)
                                                                                            const purchaseName = purchaseDetails.productName;
                                                                                            const purchasePrice = purchaseDetails.purchasePrice;
                                                                                            const purchaseAmount = purchaseDetails.purchaseAmount;

                                                                                            // variables with product information in the cart by dbProducts (wio.db)
                                                                                            const estoqueP = await dbProducts.get(`${pId.replace(`p-`, ``)}.stock`);

                                                                                            // product out of stock - error
                                                                                            if (estoqueP < purchaseAmount) {
                                                                                                await interaction.user.send({
                                                                                                    embeds: [new EmbedBuilder()
                                                                                                        .setTitle(`${client.user.username} | Erro na Compra`)
                                                                                                        .setDescription(`⚠ | Parece que alguém já adquiriu o produto: **${purchaseName}** antes de você, ${interaction.user}. Por favor, abra um ticket para relatar o problema.`)
                                                                                                        .setColor(`Red`)
                                                                                                        .setTimestamp()
                                                                                                    ]
                                                                                                });
                                                                                                return;
                                                                                            };

                                                                                            // saves information in the user profile by dbProfile (wio.db)
                                                                                            await dbProfiles.add(`${interaction.user.id}.ordersTotal`, 1);
                                                                                            await dbProfiles.add(`${interaction.user.id}.paidsTotal`, Number(purchasePrice));
                                                                                            await dbProfiles.set(`${interaction.user.id}.lastPurchase`, moment());

                                                                                            // saves information in the product by dbProducts (wio.db)
                                                                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.incomeTotal`, Number(purchasePrice));
                                                                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.sellsTotal`, Number(purchaseAmount));

                                                                                            // save new income at dbSales (wio.db)
                                                                                            await dbSales.add(`${moment().format(`L`)}.requests`, 1);
                                                                                            await dbSales.add(`${moment().format(`L`)}.receipts`, Number(purchasePrice));

                                                                                            // removes and picks up product items by dbProducts (wio.db)
                                                                                            const purchasedItems = await estoqueP.splice(0, Number(purchaseAmount));
                                                                                            await dbProducts.set(`${pId.replace(`p-`, ``)}.stock`, estoqueP);

                                                                                            // push variable with items purchased (txt)
                                                                                            for (let i = 0; i < purchasedItems.length; i++) {
                                                                                                itensRemoved += `\n📦 | Entrega do Produto: ${purchaseName} - ${i + 1}/${Number(purchaseAmount)}\n${purchasedItems[i]}\n`;
                                                                                            };

                                                                                            // add the total number of items in the variable
                                                                                            itensTotal += Number(purchaseAmount);

                                                                                        };

                                                                                    }),
                                                                                );

                                                                                // set purchase items to dbPurchases (wio.db)
                                                                                await dbPurchases.set(`${dataBalanceId}.productsDelivered`, itensRemoved);

                                                                                // checks if the number of products is less than or equal to 7
                                                                                if (Number(itensTotal) <= 7) {

                                                                                    // variables with information from the coupon used
                                                                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                    const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                    // cart payment date
                                                                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                    // log - cart time expired - channel
                                                                                    const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                    if (channelLogsPriv) {
                                                                                        channelLogsPriv.send({
                                                                                            embeds: [new EmbedBuilder()
                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                .addFields(
                                                                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${dataBalanceId}\`` },
                                                                                                    { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Saldo` },
                                                                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`${itensRemoved}\`\`\`` }
                                                                                                )
                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                            ],
                                                                                            components: [new ActionRowBuilder()
                                                                                                .addComponents(
                                                                                                    new ButtonBuilder().setCustomId(`refund-${dataBalanceId}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`).setDisabled(true)
                                                                                                )
                                                                                            ]
                                                                                        });
                                                                                    };

                                                                                    // user - message - success - itens
                                                                                    await interaction.user.send({
                                                                                        content: `${itensRemoved}`
                                                                                    }).catch((async (err) => {

                                                                                        // file name
                                                                                        const fileName = `${dataBalanceId}.txt`;

                                                                                        // create the file and add the content
                                                                                        writeFile(fileName, itensRemoved, (err) => {
                                                                                            if (err) throw err;
                                                                                        });

                                                                                        // create the attachment
                                                                                        const fileAttachment = new AttachmentBuilder(fileName);

                                                                                        // user - message - success - itens
                                                                                        await interaction.user.send({
                                                                                            files: [fileAttachment]
                                                                                        }).then((msg) => {

                                                                                            // delete the file
                                                                                            unlink(fileName, (err) => {
                                                                                                if (err) throw err;
                                                                                            });

                                                                                        });

                                                                                    }));

                                                                                } else {

                                                                                    // variables with information from the coupon used
                                                                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                    const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                    // cart payment date
                                                                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                    // file name
                                                                                    const fileName = `${dataBalanceId}.txt`;

                                                                                    // create the file and add the content
                                                                                    writeFile(fileName, itensRemoved, (err) => {
                                                                                        if (err) throw err;
                                                                                    });

                                                                                    // create the attachment
                                                                                    const fileAttachment = new AttachmentBuilder(fileName);

                                                                                    // log - product
                                                                                    const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                    if (channelLogsPriv) {
                                                                                        channelLogsPriv.send({
                                                                                            embeds: [new EmbedBuilder()
                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                .addFields(
                                                                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${dataBalanceId}\`` },
                                                                                                    { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Saldo` },
                                                                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`Produtos no TXT.\`\`\`` }
                                                                                                )
                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                            ],
                                                                                            components: [new ActionRowBuilder()
                                                                                                .addComponents(
                                                                                                    new ButtonBuilder().setCustomId(`refund-${dataBalanceId}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`).setDisabled(true)
                                                                                                )
                                                                                            ],
                                                                                            files: [fileAttachment]
                                                                                        });
                                                                                    };

                                                                                    // user - message - success - itens
                                                                                    await interaction.user.send({
                                                                                        files: [fileAttachment]
                                                                                    });

                                                                                    // delete the file
                                                                                    unlink(fileName, (err) => {
                                                                                        if (err) throw err;
                                                                                    });

                                                                                };

                                                                                // checks if the public logs channel exists
                                                                                const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                if (channelLogsPublic) {

                                                                                    // user - message - rate
                                                                                    await interaction.user.send({
                                                                                        embeds: [new EmbedBuilder()
                                                                                            .setTitle(`${client.user.username} | Avaliação`)
                                                                                            .setDescription(`Se desejar, escolha uma nota abaixo para a venda:`)
                                                                                            .setColor(`NotQuiteBlack`)
                                                                                        ],
                                                                                        components: [new ActionRowBuilder()
                                                                                            .addComponents(
                                                                                                new ButtonBuilder().setCustomId(`1`).setLabel(`1`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                new ButtonBuilder().setCustomId(`2`).setLabel(`2`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                new ButtonBuilder().setCustomId(`3`).setLabel(`3`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                new ButtonBuilder().setCustomId(`4`).setLabel(`4`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                new ButtonBuilder().setCustomId(`5`).setLabel(`5`).setEmoji(`⭐`).setStyle(`Secondary`)
                                                                                            )
                                                                                        ]
                                                                                    }).then(async (msgRate) => {

                                                                                        // createMessageComponentCollector - collector
                                                                                        const filter = (m) => m.user.id == interaction.user.id;
                                                                                        const collectorRate = msgRate.createMessageComponentCollector({
                                                                                            filter: filter,
                                                                                            time: 60000
                                                                                        });
                                                                                        collectorRate.on("collect", async (iRate) => {

                                                                                            // number of stars chosen - button
                                                                                            const rateNumber = iRate.customId;
                                                                                            if (iRate.customId == rateNumber) {

                                                                                                // create the modal
                                                                                                const modal = new ModalBuilder()
                                                                                                    .setCustomId(`modalRate`)
                                                                                                    .setTitle(`${`⭐`.repeat(rateNumber)} (${rateNumber})`)

                                                                                                // creates the components for the modal
                                                                                                const inputRateTxt = new TextInputBuilder()
                                                                                                    .setCustomId('rateText')
                                                                                                    .setLabel(`Avaliação: (opcional)`)
                                                                                                    .setMaxLength(150)
                                                                                                    .setPlaceholder(`Insira uma breve avaliação aqui ...`)
                                                                                                    .setRequired(false)
                                                                                                    .setStyle(`Paragraph`)

                                                                                                // rows for components
                                                                                                const iRateText = new ActionRowBuilder().addComponents(inputRateTxt);

                                                                                                // add the rows to the modal
                                                                                                modal.addComponents(iRateText);

                                                                                                // open the modal
                                                                                                await iRate.showModal(modal);

                                                                                                // event - interactionCreate
                                                                                                client.once("interactionCreate", async (iModal) => {

                                                                                                    // modalRate - modal - submit
                                                                                                    if (iModal.customId == `modalRate`) {

                                                                                                        // message - delete
                                                                                                        await msgRate.delete()
                                                                                                            .catch((err) => {
                                                                                                                return;
                                                                                                            });

                                                                                                        // variables with modal fields
                                                                                                        const inserterRateText = iModal.fields.getTextInputValue(`rateText`) || `\`Nenhuma Avaliação.\``;

                                                                                                        // variables with information from the coupon used
                                                                                                        const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                        // cart payment date
                                                                                                        const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                        // variables with product information
                                                                                                        const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                        const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                        // variables with dbConfigs information
                                                                                                        const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                        const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                        // log - product sale
                                                                                                        const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                        if (channelLogsPublic) {
                                                                                                            await channelLogsPublic.send({
                                                                                                                content: `${interaction.user}`,
                                                                                                                embeds: [new EmbedBuilder()
                                                                                                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                    .addFields(
                                                                                                                        { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                        { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                        { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                        { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                        { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                        { name: `⭐ | AVALIAÇÃO:`, value: `${`⭐`.repeat(rateNumber)} (${rateNumber})\n**__${interaction.user.username}__**: ${inserterRateText}` }
                                                                                                                    )
                                                                                                                    .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                                    .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                                    .setColor(`NotQuiteBlack`)
                                                                                                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                                ]
                                                                                                            });
                                                                                                        };

                                                                                                        // reply - success
                                                                                                        await iModal.reply({
                                                                                                            content: `✅ | Avaliação enviada com sucesso!`,
                                                                                                            ephemeral: true
                                                                                                        });

                                                                                                        // stop the collector (collectorRate)
                                                                                                        await collectorRate.stop();

                                                                                                    };

                                                                                                });

                                                                                            };

                                                                                        });

                                                                                        // end of time - collector
                                                                                        collectorRate.on("end", async (c, r) => {
                                                                                            if (r == "time") {

                                                                                                // message - delete
                                                                                                await msgRate.delete()
                                                                                                    .catch((err) => {
                                                                                                        return;
                                                                                                    });

                                                                                                // variables with information from the coupon used
                                                                                                const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                // cart payment date
                                                                                                const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                // variables with product information
                                                                                                const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                // variables with dbConfigs information
                                                                                                const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                // log - product sale
                                                                                                const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                if (channelLogsPublic) {
                                                                                                    await channelLogsPublic.send({
                                                                                                        content: `${interaction.user}`,
                                                                                                        embeds: [new EmbedBuilder()
                                                                                                            .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                            .addFields(
                                                                                                                { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                { name: `⭐ | AVALIAÇÃO:`, value: `\`Nenhuma Avaliação.\`` }
                                                                                                            )
                                                                                                            .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                            .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                            .setColor(`NotQuiteBlack`)
                                                                                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                        ]
                                                                                                    });
                                                                                                };

                                                                                            };
                                                                                        });

                                                                                    });

                                                                                };

                                                                                // loop - close the cart - 1 minute
                                                                                setTimeout(async (t) => {

                                                                                    // delete the channel
                                                                                    await channel.delete()
                                                                                        .catch((err) => {

                                                                                            // 10003 - code
                                                                                            if (err.code == 10003) {
                                                                                                return;
                                                                                            } else {
                                                                                                console.error(err);
                                                                                                return;
                                                                                            };

                                                                                        });

                                                                                }, 60000);

                                                                            }).catch(async (err) => {

                                                                                // channel - message - warning
                                                                                await channel.send({
                                                                                    content: `❌ | ${interaction.user}, Não foi possivel enviar os itens em sua DM.`
                                                                                });

                                                                                // channel - message - success
                                                                                await channel.send({
                                                                                    embeds: [new EmbedBuilder()
                                                                                        .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                        .addFields(
                                                                                            { name: `🛒 | Produto(s) Comprado(s):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                            { name: `📝 | ID da Compra:`, value: `${dataBalanceId}` },
                                                                                            { name: `⭐ | Obrigado por Comprar Conosco!`, value: `**${interaction.guild.name}** Agradece a sua Preferência.` },
                                                                                        )
                                                                                        .setThumbnail(thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                        .setImage(bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                        .setColor(`NotQuiteBlack`)
                                                                                        .setFooter({ text: `Seu(s) Produto(s):` })
                                                                                    ]
                                                                                });

                                                                                // promise - products - channel
                                                                                let itensRemoved = ``;
                                                                                let itensTotal = 0;
                                                                                await Promise.all(
                                                                                    allCarts.map(async (product) => {

                                                                                        // get product ids
                                                                                        const productIds = Object.keys(product.data.products);

                                                                                        // separates each product id
                                                                                        for (const pId of productIds) {

                                                                                            // product array
                                                                                            const purchaseDetails = product.data.products[pId];

                                                                                            // variables with product information in the cart by dbOpenedCarts (wio.db)
                                                                                            const purchaseName = purchaseDetails.productName;
                                                                                            const purchasePrice = purchaseDetails.purchasePrice;
                                                                                            const purchaseAmount = purchaseDetails.purchaseAmount;

                                                                                            // variables with product information in the cart by dbProducts (wio.db)
                                                                                            const estoqueP = await dbProducts.get(`${pId.replace(`p-`, ``)}.stock`);

                                                                                            // product out of stock - error
                                                                                            if (estoqueP < purchaseAmount) {
                                                                                                await channel.send({
                                                                                                    embeds: [new EmbedBuilder()
                                                                                                        .setTitle(`${client.user.username} | Erro na Compra`)
                                                                                                        .setDescription(`⚠ | Parece que alguém já adquiriu o produto: **${purchaseName}** antes de você, ${interaction.user}. Por favor, abra um ticket para relatar o problema.`)
                                                                                                        .setColor(`Red`)
                                                                                                        .setTimestamp()
                                                                                                    ]
                                                                                                });
                                                                                                return;
                                                                                            };

                                                                                            // saves information in the user profile by dbProfile (wio.db)
                                                                                            await dbProfiles.add(`${interaction.user.id}.ordersTotal`, 1);
                                                                                            await dbProfiles.add(`${interaction.user.id}.paidsTotal`, Number(purchasePrice));
                                                                                            await dbProfiles.set(`${interaction.user.id}.lastPurchase`, moment());

                                                                                            // saves information in the product by dbProducts (wio.db)
                                                                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.incomeTotal`, Number(purchasePrice));
                                                                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.sellsTotal`, Number(purchaseAmount));

                                                                                            // save new income at dbSales (wio.db)
                                                                                            await dbSales.add(`${moment().format(`L`)}.requests`, 1);
                                                                                            await dbSales.add(`${moment().format(`L`)}.receipts`, Number(purchasePrice));

                                                                                            // removes and picks up product items by dbProducts (wio.db)
                                                                                            const purchasedItems = await estoqueP.splice(0, Number(purchaseAmount));
                                                                                            await dbProducts.set(`${pId.replace(`p-`, ``)}.stock`, estoqueP);

                                                                                            // push variable with items purchased (txt)
                                                                                            for (let i = 0; i < purchasedItems.length; i++) {
                                                                                                itensRemoved += `\n📦 | Entrega do Produto: ${purchaseName} - ${i + 1}/${Number(purchaseAmount)}\n${purchasedItems[i]}\n`;
                                                                                            };

                                                                                            // add the total number of items in the variable
                                                                                            itensTotal += Number(purchaseAmount);

                                                                                        };

                                                                                    }),
                                                                                );

                                                                                // set purchase items to dbPurchases (wio.db)
                                                                                await dbPurchases.set(`${dataBalanceId}.productsDelivered`, itensRemoved);

                                                                                // checks if the number of products is less than or equal to 7
                                                                                if (Number(itensTotal) <= 7) {

                                                                                    // variables with information from the coupon used
                                                                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                    const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                    // cart payment date
                                                                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                    // log - cart time expired - channel
                                                                                    const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                    if (channelLogsPriv) {
                                                                                        channelLogsPriv.send({
                                                                                            embeds: [new EmbedBuilder()
                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                .addFields(
                                                                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${dataBalanceId}\`` },
                                                                                                    { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Saldo` },
                                                                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`${itensRemoved}\`\`\`` }
                                                                                                )
                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                            ],
                                                                                            components: [new ActionRowBuilder()
                                                                                                .addComponents(
                                                                                                    new ButtonBuilder().setCustomId(`refund-${dataBalanceId}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`).setDisabled(true)
                                                                                                )
                                                                                            ]
                                                                                        });
                                                                                    };

                                                                                    // channel - message - success - itens
                                                                                    await channel.send({
                                                                                        content: `${itensRemoved}`
                                                                                    }).catch((async (err) => {

                                                                                        // file name
                                                                                        const fileName = `${dataBalanceId}.txt`;

                                                                                        // create the file and add the content
                                                                                        writeFile(fileName, itensRemoved, (err) => {
                                                                                            if (err) throw err;
                                                                                        });

                                                                                        // create the attachment
                                                                                        const fileAttachment = new AttachmentBuilder(fileName);

                                                                                        // channel - message - success - itens
                                                                                        await channel.send({
                                                                                            files: [fileAttachment]
                                                                                        }).then((msg) => {

                                                                                            // delete the file
                                                                                            unlink(fileName, (err) => {
                                                                                                if (err) throw err;
                                                                                            });

                                                                                        });

                                                                                    }));

                                                                                } else {

                                                                                    // variables with information from the coupon used
                                                                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                    const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                    // cart payment date
                                                                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                    // file name
                                                                                    const fileName = `${dataBalanceId}.txt`;

                                                                                    // create the file and add the content
                                                                                    writeFile(fileName, itensRemoved, (err) => {
                                                                                        if (err) throw err;
                                                                                    });

                                                                                    // create the attachment
                                                                                    const fileAttachment = new AttachmentBuilder(fileName);

                                                                                    // log - product
                                                                                    const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                    if (channelLogsPriv) {
                                                                                        channelLogsPriv.send({
                                                                                            embeds: [new EmbedBuilder()
                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                .addFields(
                                                                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${dataBalanceId}\`` },
                                                                                                    { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Saldo` },
                                                                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`Produtos no TXT.\`\`\`` }
                                                                                                )
                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                            ],
                                                                                            components: [new ActionRowBuilder()
                                                                                                .addComponents(
                                                                                                    new ButtonBuilder().setCustomId(`refund-${dataBalanceId}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`).setDisabled(true)
                                                                                                )
                                                                                            ],
                                                                                            files: [fileAttachment]
                                                                                        });
                                                                                    };

                                                                                    // channel - message - success - itens
                                                                                    await channel.send({
                                                                                        files: [fileAttachment]
                                                                                    });

                                                                                    // delete the file
                                                                                    unlink(fileName, (err) => {
                                                                                        if (err) throw err;
                                                                                    });

                                                                                };

                                                                                // checks if the public logs channel exists
                                                                                const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                if (channelLogsPublic) {

                                                                                    // channel - message - rate
                                                                                    await channel.send({
                                                                                        embeds: [new EmbedBuilder()
                                                                                            .setTitle(`${client.user.username} | Avaliação`)
                                                                                            .setDescription(`Se desejar, escolha uma nota abaixo para a venda:`)
                                                                                            .setColor(`NotQuiteBlack`)
                                                                                        ],
                                                                                        components: [new ActionRowBuilder()
                                                                                            .addComponents(
                                                                                                new ButtonBuilder().setCustomId(`1`).setLabel(`1`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                new ButtonBuilder().setCustomId(`2`).setLabel(`2`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                new ButtonBuilder().setCustomId(`3`).setLabel(`3`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                new ButtonBuilder().setCustomId(`4`).setLabel(`4`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                new ButtonBuilder().setCustomId(`5`).setLabel(`5`).setEmoji(`⭐`).setStyle(`Secondary`)
                                                                                            )
                                                                                        ]
                                                                                    }).then(async (msgRate) => {

                                                                                        // createMessageComponentCollector - collector
                                                                                        const filter = (m) => m.user.id == interaction.user.id;
                                                                                        const collectorRate = msgRate.createMessageComponentCollector({
                                                                                            filter: filter,
                                                                                            time: 60000
                                                                                        });
                                                                                        collectorRate.on("collect", async (iRate) => {

                                                                                            // number of stars chosen - button
                                                                                            const rateNumber = iRate.customId;
                                                                                            if (iRate.customId == rateNumber) {

                                                                                                // create the modal
                                                                                                const modal = new ModalBuilder()
                                                                                                    .setCustomId(`modalRate`)
                                                                                                    .setTitle(`${`⭐`.repeat(rateNumber)} (${rateNumber})`)

                                                                                                // creates the components for the modal
                                                                                                const inputRateTxt = new TextInputBuilder()
                                                                                                    .setCustomId('rateText')
                                                                                                    .setLabel(`Avaliação: (opcional)`)
                                                                                                    .setMaxLength(150)
                                                                                                    .setPlaceholder(`Insira uma breve avaliação aqui ...`)
                                                                                                    .setRequired(false)
                                                                                                    .setStyle(`Paragraph`)

                                                                                                // rows for components
                                                                                                const iRateText = new ActionRowBuilder().addComponents(inputRateTxt);

                                                                                                // add the rows to the modal
                                                                                                modal.addComponents(iRateText);

                                                                                                // open the modal
                                                                                                await iRate.showModal(modal);

                                                                                                // event - interactionCreate
                                                                                                client.once("interactionCreate", async (iModal) => {

                                                                                                    // modalRate - modal - submit
                                                                                                    if (iModal.customId == `modalRate`) {

                                                                                                        // message - delete
                                                                                                        await msgRate.delete()
                                                                                                            .catch((err) => {
                                                                                                                return;
                                                                                                            });

                                                                                                        // variables with modal fields
                                                                                                        const inserterRateText = iModal.fields.getTextInputValue(`rateText`) || `\`Nenhuma Avaliação.\``;

                                                                                                        // variables with information from the coupon used
                                                                                                        const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                        // cart payment date
                                                                                                        const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                        // variables with product information
                                                                                                        const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                        const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                        // variables with dbConfigs information
                                                                                                        const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                        const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                        // log - product sale
                                                                                                        const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                        if (channelLogsPublic) {
                                                                                                            await channelLogsPublic.send({
                                                                                                                content: `${interaction.user}`,
                                                                                                                embeds: [new EmbedBuilder()
                                                                                                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                    .addFields(
                                                                                                                        { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                        { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                        { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                        { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                        { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                        { name: `⭐ | AVALIAÇÃO:`, value: `${`⭐`.repeat(rateNumber)} (${rateNumber})\n**__${interaction.user.username}__**: ${inserterRateText}` }
                                                                                                                    )
                                                                                                                    .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                                    .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                                    .setColor(`NotQuiteBlack`)
                                                                                                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                                ]
                                                                                                            });
                                                                                                        };

                                                                                                        // reply - success
                                                                                                        await iModal.reply({
                                                                                                            content: `✅ | Avaliação enviada com sucesso!`,
                                                                                                            ephemeral: true
                                                                                                        });

                                                                                                        // stop the collector (collectorRate)
                                                                                                        await collectorRate.stop();

                                                                                                    };

                                                                                                });

                                                                                            };

                                                                                        });

                                                                                        // end of time - collector
                                                                                        collectorRate.on("end", async (c, r) => {
                                                                                            if (r == "time") {

                                                                                                // message - delete
                                                                                                await msgRate.delete()
                                                                                                    .catch((err) => {
                                                                                                        return;
                                                                                                    });

                                                                                                // variables with information from the coupon used
                                                                                                const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                // cart payment date
                                                                                                const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                // variables with product information
                                                                                                const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                // variables with dbConfigs information
                                                                                                const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                // log - product sale
                                                                                                const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                if (channelLogsPublic) {
                                                                                                    await channelLogsPublic.send({
                                                                                                        content: `${interaction.user}`,
                                                                                                        embeds: [new EmbedBuilder()
                                                                                                            .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                            .addFields(
                                                                                                                { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                { name: `⭐ | AVALIAÇÃO:`, value: `\`Nenhuma Avaliação.\`` }
                                                                                                            )
                                                                                                            .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                            .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                            .setColor(`NotQuiteBlack`)
                                                                                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                        ]
                                                                                                    });
                                                                                                };

                                                                                            };
                                                                                        });

                                                                                    });

                                                                                };

                                                                                // loop - close the cart - 10 minutes
                                                                                setTimeout(async (t) => {

                                                                                    // delete the channel
                                                                                    await channel.delete()
                                                                                        .catch((err) => {

                                                                                            // 10003 - code
                                                                                            if (err.code == 10003) {
                                                                                                return;
                                                                                            } else {
                                                                                                console.error(err);
                                                                                                return;
                                                                                            };

                                                                                        });

                                                                                }, 600000);

                                                                            });

                                                                        });

                                                                    // promise - products - update messages
                                                                    await Promise.all(
                                                                        allCarts.map(async (product) => {

                                                                            // get product ids
                                                                            const productIds = Object.keys(product.data.products);

                                                                            // separates each product id
                                                                            for (const pId of productIds) {

                                                                                // get array with product information
                                                                                const productNew = await dbProducts.get(pId.replace(`p-`, ``));

                                                                                // variables with message/channel ids by dbProducts (wio.db)
                                                                                const channelId = productNew.msgLocalization.channelId;
                                                                                const messageId = productNew.msgLocalization.messageId;

                                                                                // message channel
                                                                                const channelMsg = await interaction.guild.channels.cache.get(channelId);

                                                                                // purchase message
                                                                                const msgFetched = await channelMsg.messages.cache.get(messageId);

                                                                                // variables with product information
                                                                                const nameP = productNew.name;
                                                                                const descriptionP = productNew.description;
                                                                                const thumbP = productNew.thumbUrl;
                                                                                const bannerP = productNew.bannerUrl;
                                                                                const colorP = productNew.color;
                                                                                const priceP = productNew.price;
                                                                                const estoqueP = productNew.stock;

                                                                                // variables with dbConfigs information
                                                                                const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                // embed product
                                                                                const embedProduct = new EmbedBuilder()
                                                                                    .setTitle(`${client.user.username} | Produto`)
                                                                                    .setDescription(`**\`\`\`${descriptionP}\`\`\`\n🌎 | Nome: ${nameP}\n💸 | Preço: R$__${Number(priceP).toFixed(2)}__\n📦 | Estoque: __${estoqueP.length}__**`)
                                                                                    .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                    .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                    .setColor(colorP != "none" ? colorP : `NotQuiteBlack`)

                                                                                // update the purchase message (msgFetched)
                                                                                await msgFetched.edit({
                                                                                    embeds: [embedProduct]
                                                                                }).catch((err) => {
                                                                                    return;
                                                                                });

                                                                            };

                                                                        }),
                                                                    );

                                                                    // stop the collector (collectorBalance)
                                                                    await collectorBalance.stop();

                                                                };

                                                                // previousPageBalance - button
                                                                if (iBalance.customId == `previousPageBalance`) {

                                                                    // deferUpdate - postphone the update
                                                                    await iBalance.deferUpdate();

                                                                    // message - edit
                                                                    await msgCart2.edit({
                                                                        content: ``,
                                                                        embeds: [embedFormPayment],
                                                                        components: [rowFormPayment]
                                                                    });

                                                                    // stop the collector (collectorBalance)
                                                                    await collectorBalance.stop();

                                                                };

                                                            });

                                                        };

                                                        // sitePayment - button
                                                        if (iCart3.customId == `sitePayment`) {

                                                            // deferUpdate - postphone the update
                                                            await iCart3.deferUpdate();

                                                            // stop the loop - end
                                                            clearTimeout(loopCloseEnd);

                                                            // message - edit
                                                            await msgCart2.edit({
                                                                content: `🔁 | Gerando o pagamento ...`,
                                                                embeds: [],
                                                                components: [],
                                                                ephemeral: true
                                                            });

                                                            // mercadopago - client
                                                            const mpClient = new MercadoPagoConfig({ accessToken: tokenMp });

                                                            // mercadopago - methods
                                                            const mpPreference = new Preference(mpClient);
                                                            const mpMerchantOrder = new MerchantOrder(mpClient);

                                                            // preference details
                                                            const preferenceData = {
                                                                items: allItemsPayment,
                                                                back_urls: {
                                                                    success: `https://discord.com/channels/${interaction.guild.id}/${channel.id}`,
                                                                    pending: `https://discord.com/channels/${interaction.guild.id}/${channel.id}`,
                                                                    failure: `https://discord.com/channels/${interaction.guild.id}/${channel.id}`
                                                                },
                                                                date_of_expiration: moment().add(10, `minutes`),
                                                                expires: true,
                                                                auto_return: `approved`,
                                                                payer: {
                                                                    email: `${interaction.user.username}@${interaction.guild.name.trim()}.com`,
                                                                }
                                                            };

                                                            // create the payment - preference
                                                            await mpPreference.create({ body: preferenceData })
                                                                .then(async (data) => {

                                                                    // loop - close the cart within a period of time - payment
                                                                    const loopClosePayment = setTimeout(async (t) => {

                                                                        // delete the product in dbOpenedCarts (wio.db)
                                                                        await dbOpenedCarts.delete(channel.id);

                                                                        // delete the channel
                                                                        await channel.delete()
                                                                            .catch((err) => {

                                                                                // 10003 - code
                                                                                if (err.code == 10003) {
                                                                                    return;
                                                                                } else {
                                                                                    console.error(err);
                                                                                    return;
                                                                                };

                                                                            });

                                                                        // log - cart time expired - channel
                                                                        const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                        if (channelLogsPriv) {
                                                                            await channelLogsPriv.send({
                                                                                embeds: [new EmbedBuilder()
                                                                                    .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                                                                    .setTitle(`${client.user.username} | Compra Cancelada`)
                                                                                    .addFields(
                                                                                        { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                        { name: `📜 | Motivo:`, value: `Cancelada por inatividade.` },
                                                                                        { name: `⏰ | Data & Horário:`, value: `${createdDate}` }
                                                                                    )
                                                                                    .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                                                                                    .setColor(`Red`)
                                                                                    .setTimestamp()
                                                                                ]
                                                                            });
                                                                        };

                                                                        // log - cart time expired - user
                                                                        await interaction.user.send({
                                                                            embeds: [new EmbedBuilder()
                                                                                .setTitle(`${client.user.username} | Compra Cancelada`)
                                                                                .setDescription(`Sua compra foi cancelada devido à **inatividade**. Para reabrir o carrinho, clique no botão abaixo.`)
                                                                                .setColor(`Red`)
                                                                                .setTimestamp()
                                                                            ],
                                                                            components: [new ActionRowBuilder()
                                                                                .addComponents(
                                                                                    new ButtonBuilder().setLabel(`Comprar`).setEmoji(`🛒`).setStyle(`Link`).setURL(`https://discord.com/channels/${iCart3.guild.id}/${product.msgLocalization.channelId}`)
                                                                                )
                                                                            ]
                                                                        }).catch((err) => {
                                                                            return;
                                                                        });

                                                                    }, 600000);

                                                                    // row pix - payment
                                                                    const rowPixPayment = new ActionRowBuilder()
                                                                        .addComponents(
                                                                            new ButtonBuilder().setLabel(`Realizar o Pagamento`).setEmoji(`💠`).setStyle(`Link`).setURL(data.init_point),
                                                                            new ButtonBuilder().setCustomId(`checkPayment`).setLabel(`Verificar Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                                            new ButtonBuilder().setCustomId(`cancelPayment`).setEmoji(`❌`).setStyle(`Danger`)
                                                                        );

                                                                    // time that payment will expire (moment)
                                                                    const tenMinutes = moment().add(10, `minutes`);
                                                                    const expirationTenMinutes = `<t:${Math.floor(tenMinutes.toDate().getTime() / 1000)}:f> (<t:${Math.floor(tenMinutes.toDate().getTime() / 1000)}:R>)`;

                                                                    // embed pix - payment
                                                                    const embedPixPayment = new EmbedBuilder()
                                                                        .setTitle(`${client.user.username} | Pagamento`)
                                                                        .addFields(
                                                                            { name: `🌎 | Produto(s):`, value: `${allProductsNames.join(`\n`)}` },
                                                                            { name: `💸 | Valor:`, value: `R$${Number(totalPrice).toFixed(2)}` },
                                                                            { name: `⏰ | Pagamento expira em:`, value: expirationTenMinutes }
                                                                        )
                                                                        .setColor(`NotQuiteBlack`)
                                                                        .setFooter({ text: `Após realizar o pagamento, clique no botão correspondente para verificar se o pagamento foi aprovado.` });

                                                                    // message - edit
                                                                    await msgCart2.edit({
                                                                        content: `${interaction.user}`,
                                                                        embeds: [embedPixPayment],
                                                                        components: [rowPixPayment]
                                                                    });

                                                                    // createMessageComponentCollector - collector
                                                                    const filter = (m) => m.user.id == interaction.user.id;
                                                                    const collectorPreference = channel.createMessageComponentCollector({
                                                                        filter: filter,
                                                                        time: 600000
                                                                    });
                                                                    collectorPreference.on("collect", async (iPreference) => {

                                                                        // checkPayment - button
                                                                        if (iPreference.customId == `checkPayment`) {

                                                                            // deferUpdate - postphone the update
                                                                            await iPreference.deferUpdate();

                                                                            // checks the payment status associated with the preference (date)
                                                                            const preferenceSearch = await mpMerchantOrder.search({ options: { preference_id: data.id } });
                                                                            const preferenceElements = preferenceSearch.elements;

                                                                            // checks whether the payment is null
                                                                            if (preferenceElements == null) {

                                                                                // message - edit
                                                                                await msgCart2.edit({
                                                                                    components: [new ActionRowBuilder()
                                                                                        .addComponents(
                                                                                            new ButtonBuilder().setLabel(`Realizar o Pagamento`).setEmoji(`💠`).setStyle(`Link`).setURL(data.init_point),
                                                                                            new ButtonBuilder().setCustomId(`checkPayment`).setLabel(`Verificar Pagamento`).setEmoji(`✅`).setStyle(`Success`).setDisabled(true),
                                                                                            new ButtonBuilder().setCustomId(`cancelPayment`).setEmoji(`❌`).setStyle(`Danger`)
                                                                                        )
                                                                                    ]
                                                                                });

                                                                                // loop - edit the message and activate the check payment button - payment
                                                                                setTimeout(async (t) => {

                                                                                    // message - edit
                                                                                    await msgCart2.edit({
                                                                                        components: [new ActionRowBuilder()
                                                                                            .addComponents(
                                                                                                new ButtonBuilder().setLabel(`Realizar o Pagamento`).setEmoji(`💠`).setStyle(`Link`).setURL(data.init_point),
                                                                                                new ButtonBuilder().setCustomId(`checkPayment`).setLabel(`Verificar Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                                                                new ButtonBuilder().setCustomId(`cancelPayment`).setEmoji(`❌`).setStyle(`Danger`)
                                                                                            )
                                                                                        ]
                                                                                    }).catch((err) => {
                                                                                        return;
                                                                                    });


                                                                                }, 5000);

                                                                                // message - pending
                                                                                await iPreference.followUp({
                                                                                    content: `📝 | O pagamento não foi gerado ainda.`,
                                                                                    ephemeral: true
                                                                                });

                                                                            } else {

                                                                                // payment status if not null
                                                                                const preferenceStatus = preferenceElements[0].payments[0].status;

                                                                                // preference payment array
                                                                                const paymentId = preferenceElements[0].payments[0].id;

                                                                                // checks whether the payment status is approved or pending
                                                                                if (preferenceStatus == `pending`) {

                                                                                    // message - edit
                                                                                    await msgCart2.edit({
                                                                                        components: [new ActionRowBuilder()
                                                                                            .addComponents(
                                                                                                new ButtonBuilder().setLabel(`Realizar o Pagamento`).setEmoji(`💠`).setStyle(`Link`).setURL(data.init_point),
                                                                                                new ButtonBuilder().setCustomId(`checkPayment`).setLabel(`Verificar Pagamento`).setEmoji(`✅`).setStyle(`Success`).setDisabled(true),
                                                                                                new ButtonBuilder().setCustomId(`cancelPayment`).setEmoji(`❌`).setStyle(`Danger`)
                                                                                            )
                                                                                        ]
                                                                                    });

                                                                                    // loop - edit the message and activate the check payment button - payment
                                                                                    setTimeout(async (t) => {

                                                                                        // message - edit
                                                                                        await msgCart2.edit({
                                                                                            components: [new ActionRowBuilder()
                                                                                                .addComponents(
                                                                                                    new ButtonBuilder().setLabel(`Realizar o Pagamento`).setEmoji(`💠`).setStyle(`Link`).setURL(data.init_point),
                                                                                                    new ButtonBuilder().setCustomId(`checkPayment`).setLabel(`Verificar Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                                                                    new ButtonBuilder().setCustomId(`cancelPayment`).setEmoji(`❌`).setStyle(`Danger`)
                                                                                                )
                                                                                            ]
                                                                                        }).catch((err) => {
                                                                                            return;
                                                                                        });


                                                                                    }, 5000);

                                                                                    // message - pending
                                                                                    await iPreference.followUp({
                                                                                        content: `📝 | O pagamento está **pendente**.`,
                                                                                        ephemeral: true
                                                                                    });

                                                                                } else if (preferenceStatus == `approved`) {

                                                                                    // stop the loop - payment
                                                                                    clearTimeout(loopClosePayment);

                                                                                    // delete the product in dbOpenedCarts (wio.db)
                                                                                    await dbOpenedCarts.delete(channel.id);

                                                                                    // clear messages - channel
                                                                                    await channel.bulkDelete(3)
                                                                                        .then(async (map) => {

                                                                                            // checks if the role of the product is not equal to 0
                                                                                            const roleProduct = await dbProducts.get(`${productId}.role`);
                                                                                            if (roleProduct != `none`) {

                                                                                                // checks if the user has the position requested in the coupon
                                                                                                const roleGuild = interaction.guild.roles.cache.get(roleProduct);
                                                                                                if (roleGuild) {

                                                                                                    // search for user profile on the guild
                                                                                                    const memberGuild = interaction.guild.members.cache.get(interaction.user.id) || `\`${roleProduct}\` não encontrado.`;

                                                                                                    // set a role on the user
                                                                                                    await memberGuild.roles.add(roleGuild)
                                                                                                        .then(async (role) => {

                                                                                                            // message - success
                                                                                                            await channel.send({
                                                                                                                content: `✅ | O cargo: ${roleGuild} foi setado com sucesso.`
                                                                                                            });

                                                                                                        }).catch(async (err) => {

                                                                                                            // message - error
                                                                                                            await channel.send({
                                                                                                                content: `❌ | Erro ao setar o cargo: ${roleGuild}\n\`\`\`js\n${err.name}\`\`\``
                                                                                                            });

                                                                                                        });

                                                                                                };

                                                                                            } else {

                                                                                                // checks if the role of the config is not equal to 0
                                                                                                const roleConfig = await dbConfigs.get(`roles.roleCustomerId`);
                                                                                                if (roleConfig != `none`) {

                                                                                                    // checks if the user has the position requested in the coupon
                                                                                                    const roleGuild = interaction.guild.roles.cache.get(roleConfig);
                                                                                                    if (roleGuild) {

                                                                                                        // search for user profile on the guild
                                                                                                        const memberGuild = interaction.guild.members.cache.get(interaction.user.id) || `\`${roleProduct}\` não encontrado.`;

                                                                                                        // set a role on the user
                                                                                                        await memberGuild.roles.add(roleGuild)
                                                                                                            .then(async (role) => {

                                                                                                                // message - success
                                                                                                                await channel.send({
                                                                                                                    content: `✅ | O cargo: ${roleGuild} foi setado com sucesso.`
                                                                                                                });

                                                                                                            }).catch(async (err) => {

                                                                                                                // message - error
                                                                                                                await channel.send({
                                                                                                                    content: `❌ | Erro ao setar o cargo: ${roleGuild}\n\`\`\`js\n${err.name}\`\`\``
                                                                                                                });

                                                                                                            });

                                                                                                    };
                                                                                                };

                                                                                            };

                                                                                            // set purchase information to dbPurchases (wio.db)
                                                                                            await dbPurchases.set(`${paymentId}.id`, paymentId);
                                                                                            await dbPurchases.set(`${paymentId}.productsIds`, allProductsIds);
                                                                                            await dbPurchases.set(`${paymentId}.productsNames`, allProductsNames);
                                                                                            await dbPurchases.set(`${paymentId}.pricePaid`, Number(totalPrice).toFixed(2));
                                                                                            await dbPurchases.set(`${paymentId}.buyer`, interaction.user.id);
                                                                                            await dbPurchases.set(`${paymentId}.date`, moment());

                                                                                            // channel - message - success
                                                                                            await channel.send({
                                                                                                content: `🎉 | Pagamento Aprovado!\n📝 | ID da compra: **${paymentId}**`
                                                                                            });

                                                                                            // variables with dbConfigs information
                                                                                            const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                            const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                            // user - message - success
                                                                                            await interaction.user.send({
                                                                                                embeds: [new EmbedBuilder()
                                                                                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                    .addFields(
                                                                                                        { name: `🛒 | Produto(s) Comprado(s):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                        { name: `📝 | ID da Compra:`, value: `${paymentId}` },
                                                                                                        { name: `⭐ | Obrigado por Comprar Conosco!`, value: `**__${interaction.guild.name}__** Agradece a sua Preferência.` },
                                                                                                    )
                                                                                                    .setThumbnail(thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                    .setImage(bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                    .setColor(`NotQuiteBlack`)
                                                                                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                ]
                                                                                            }).then(async (msg) => {

                                                                                                // channel - message - success 
                                                                                                const DMBot = await interaction.user.createDM();
                                                                                                await channel.send({
                                                                                                    embeds: [new EmbedBuilder()
                                                                                                        .setTitle(`${client.user.username} | Pagamento Aprovado`)
                                                                                                        .setDescription(`${interaction.user} Verifique sua DM.`)
                                                                                                        .setColor(`NotQuiteBlack`)
                                                                                                        .setFooter({ text: `Este carrinho será fechado em 1 minuto.` })
                                                                                                    ],
                                                                                                    components: [new ActionRowBuilder()
                                                                                                        .addComponents(
                                                                                                            new ButtonBuilder()
                                                                                                                .setLabel(`Atalho para DM`)
                                                                                                                .setEmoji(`🤖`)
                                                                                                                .setStyle(`Link`)
                                                                                                                .setURL(DMBot.url)
                                                                                                        )
                                                                                                    ]
                                                                                                });

                                                                                                // promise - products - dm
                                                                                                let itensRemoved = ``;
                                                                                                let itensTotal = 0;
                                                                                                await Promise.all(
                                                                                                    allCarts.map(async (product) => {

                                                                                                        // get product ids
                                                                                                        const productIds = Object.keys(product.data.products);

                                                                                                        // separates each product id
                                                                                                        for (const pId of productIds) {

                                                                                                            // product array
                                                                                                            const purchaseDetails = product.data.products[pId];

                                                                                                            // variables with product information in the cart by dbOpenedCarts (wio.db)
                                                                                                            const purchaseName = purchaseDetails.productName;
                                                                                                            const purchasePrice = purchaseDetails.purchasePrice;
                                                                                                            const purchaseAmount = purchaseDetails.purchaseAmount;

                                                                                                            // variables with product information in the cart by dbProducts (wio.db)
                                                                                                            const estoqueP = await dbProducts.get(`${pId.replace(`p-`, ``)}.stock`);

                                                                                                            // product out of stock - error
                                                                                                            if (estoqueP < purchaseAmount) {
                                                                                                                await interaction.user.send({
                                                                                                                    embeds: [new EmbedBuilder()
                                                                                                                        .setTitle(`${client.user.username} | Erro na Compra`)
                                                                                                                        .setDescription(`⚠ | Parece que alguém já adquiriu o produto: **${purchaseName}** antes de você, ${interaction.user}. Por favor, abra um ticket para relatar o problema.`)
                                                                                                                        .setColor(`Red`)
                                                                                                                        .setTimestamp()
                                                                                                                    ]
                                                                                                                });
                                                                                                                return;
                                                                                                            };

                                                                                                            // saves information in the user profile by dbProfile (wio.db)
                                                                                                            await dbProfiles.add(`${interaction.user.id}.ordersTotal`, 1);
                                                                                                            await dbProfiles.add(`${interaction.user.id}.paidsTotal`, Number(purchasePrice));
                                                                                                            await dbProfiles.set(`${interaction.user.id}.lastPurchase`, moment());

                                                                                                            // saves information in the product by dbProducts (wio.db)
                                                                                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.incomeTotal`, Number(purchasePrice));
                                                                                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.sellsTotal`, Number(purchaseAmount));

                                                                                                            // save new income at dbSales (wio.db)
                                                                                                            await dbSales.add(`${moment().format(`L`)}.requests`, 1);
                                                                                                            await dbSales.add(`${moment().format(`L`)}.receipts`, Number(purchasePrice));

                                                                                                            // removes and picks up product items by dbProducts (wio.db)
                                                                                                            const purchasedItems = await estoqueP.splice(0, Number(purchaseAmount));
                                                                                                            await dbProducts.set(`${pId.replace(`p-`, ``)}.stock`, estoqueP);

                                                                                                            // push variable with items purchased (txt)
                                                                                                            for (let i = 0; i < purchasedItems.length; i++) {
                                                                                                                itensRemoved += `\n📦 | Entrega do Produto: ${purchaseName} - ${i + 1}/${Number(purchaseAmount)}\n${purchasedItems[i]}\n`;
                                                                                                            };

                                                                                                            // add the total number of items in the variable
                                                                                                            itensTotal += Number(purchaseAmount);

                                                                                                        };

                                                                                                    }),
                                                                                                );

                                                                                                // set purchase items to dbPurchases (wio.db)
                                                                                                await dbPurchases.set(`${paymentId}.productsDelivered`, itensRemoved);

                                                                                                // checks if the number of products is less than or equal to 7
                                                                                                if (Number(itensTotal) <= 7) {

                                                                                                    // variables with information from the coupon used
                                                                                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                                    const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                                    // cart payment date
                                                                                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                    // log - cart time expired - channel
                                                                                                    const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                                    if (channelLogsPriv) {
                                                                                                        channelLogsPriv.send({
                                                                                                            embeds: [new EmbedBuilder()
                                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                .addFields(
                                                                                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${paymentId}\`` },
                                                                                                                    { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Pix - Site` },
                                                                                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`${itensRemoved}\`\`\`` }
                                                                                                                )
                                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                            ],
                                                                                                            components: [new ActionRowBuilder()
                                                                                                                .addComponents(
                                                                                                                    new ButtonBuilder().setCustomId(`refund-${paymentId}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`)
                                                                                                                )
                                                                                                            ]
                                                                                                        });
                                                                                                    };

                                                                                                    // user - message - success - itens
                                                                                                    await interaction.user.send({
                                                                                                        content: `${itensRemoved}`
                                                                                                    }).catch((async (err) => {

                                                                                                        // file name
                                                                                                        const fileName = `${paymentId}.txt`;

                                                                                                        // create the file and add the content
                                                                                                        writeFile(fileName, itensRemoved, (err) => {
                                                                                                            if (err) throw err;
                                                                                                        });

                                                                                                        // create the attachment
                                                                                                        const fileAttachment = new AttachmentBuilder(fileName);

                                                                                                        // user - message - success - itens
                                                                                                        await interaction.user.send({
                                                                                                            files: [fileAttachment]
                                                                                                        }).then((msg) => {

                                                                                                            // delete the file
                                                                                                            unlink(fileName, (err) => {
                                                                                                                if (err) throw err;
                                                                                                            });

                                                                                                        });

                                                                                                    }));

                                                                                                } else {

                                                                                                    // variables with information from the coupon used
                                                                                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                                    const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                                    // cart payment date
                                                                                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                    // file name
                                                                                                    const fileName = `${paymentId}.txt`;

                                                                                                    // create the file and add the content
                                                                                                    writeFile(fileName, itensRemoved, (err) => {
                                                                                                        if (err) throw err;
                                                                                                    });

                                                                                                    // create the attachment
                                                                                                    const fileAttachment = new AttachmentBuilder(fileName);

                                                                                                    // log - product
                                                                                                    const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                                    if (channelLogsPriv) {
                                                                                                        channelLogsPriv.send({
                                                                                                            embeds: [new EmbedBuilder()
                                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                .addFields(
                                                                                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${paymentId}\`` },
                                                                                                                    { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Pix - Site` },
                                                                                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`Produtos no TXT.\`\`\`` }
                                                                                                                )
                                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                            ],
                                                                                                            components: [new ActionRowBuilder()
                                                                                                                .addComponents(
                                                                                                                    new ButtonBuilder().setCustomId(`refund-${paymentId}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`)
                                                                                                                )
                                                                                                            ],
                                                                                                            files: [fileAttachment]
                                                                                                        });
                                                                                                    };

                                                                                                    // user - message - success - itens
                                                                                                    await interaction.user.send({
                                                                                                        files: [fileAttachment]
                                                                                                    });

                                                                                                    // delete the file
                                                                                                    unlink(fileName, (err) => {
                                                                                                        if (err) throw err;
                                                                                                    });

                                                                                                };

                                                                                                // checks if the public logs channel exists
                                                                                                const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                if (channelLogsPublic) {

                                                                                                    // user - message - rate
                                                                                                    await interaction.user.send({
                                                                                                        embeds: [new EmbedBuilder()
                                                                                                            .setTitle(`${client.user.username} | Avaliação`)
                                                                                                            .setDescription(`Se desejar, escolha uma nota abaixo para a venda:`)
                                                                                                            .setColor(`NotQuiteBlack`)
                                                                                                        ],
                                                                                                        components: [new ActionRowBuilder()
                                                                                                            .addComponents(
                                                                                                                new ButtonBuilder().setCustomId(`1`).setLabel(`1`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                                new ButtonBuilder().setCustomId(`2`).setLabel(`2`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                                new ButtonBuilder().setCustomId(`3`).setLabel(`3`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                                new ButtonBuilder().setCustomId(`4`).setLabel(`4`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                                new ButtonBuilder().setCustomId(`5`).setLabel(`5`).setEmoji(`⭐`).setStyle(`Secondary`)
                                                                                                            )
                                                                                                        ]
                                                                                                    }).then(async (msgRate) => {

                                                                                                        // createMessageComponentCollector - collector
                                                                                                        const filter = (m) => m.user.id == interaction.user.id;
                                                                                                        const collectorRate = msgRate.createMessageComponentCollector({
                                                                                                            filter: filter,
                                                                                                            time: 60000
                                                                                                        });
                                                                                                        collectorRate.on("collect", async (iRate) => {

                                                                                                            // number of stars chosen - button
                                                                                                            const rateNumber = iRate.customId;
                                                                                                            if (iRate.customId == rateNumber) {

                                                                                                                // create the modal
                                                                                                                const modal = new ModalBuilder()
                                                                                                                    .setCustomId(`modalRate`)
                                                                                                                    .setTitle(`${`⭐`.repeat(rateNumber)} (${rateNumber})`)

                                                                                                                // creates the components for the modal
                                                                                                                const inputRateTxt = new TextInputBuilder()
                                                                                                                    .setCustomId('rateText')
                                                                                                                    .setLabel(`Avaliação: (opcional)`)
                                                                                                                    .setMaxLength(150)
                                                                                                                    .setPlaceholder(`Insira uma breve avaliação aqui ...`)
                                                                                                                    .setRequired(false)
                                                                                                                    .setStyle(`Paragraph`)

                                                                                                                // rows for components
                                                                                                                const iRateText = new ActionRowBuilder().addComponents(inputRateTxt);

                                                                                                                // add the rows to the modal
                                                                                                                modal.addComponents(iRateText);

                                                                                                                // open the modal
                                                                                                                await iRate.showModal(modal);

                                                                                                                // event - interactionCreate
                                                                                                                client.once("interactionCreate", async (iModal) => {

                                                                                                                    // modalRate - modal - submit
                                                                                                                    if (iModal.customId == `modalRate`) {

                                                                                                                        // message - delete
                                                                                                                        await msgRate.delete()
                                                                                                                            .catch((err) => {
                                                                                                                                return;
                                                                                                                            });

                                                                                                                        // variables with modal fields
                                                                                                                        const inserterRateText = iModal.fields.getTextInputValue(`rateText`) || `\`Nenhuma Avaliação.\``;

                                                                                                                        // variables with information from the coupon used
                                                                                                                        const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                                        // cart payment date
                                                                                                                        const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                                        // variables with product information
                                                                                                                        const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                                        const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                                        // variables with dbConfigs information
                                                                                                                        const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                                        const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                                        // log - product sale
                                                                                                                        const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                                        if (channelLogsPublic) {
                                                                                                                            await channelLogsPublic.send({
                                                                                                                                content: `${interaction.user}`,
                                                                                                                                embeds: [new EmbedBuilder()
                                                                                                                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                                    .addFields(
                                                                                                                                        { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                                        { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                                        { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                                        { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                                        { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                                        { name: `⭐ | AVALIAÇÃO:`, value: `${`⭐`.repeat(rateNumber)} (${rateNumber})\n**__${interaction.user.username}__**: ${inserterRateText}` }
                                                                                                                                    )
                                                                                                                                    .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                                                    .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                                                    .setColor(`NotQuiteBlack`)
                                                                                                                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                                                ]
                                                                                                                            });
                                                                                                                        };

                                                                                                                        // reply - success
                                                                                                                        await iModal.reply({
                                                                                                                            content: `✅ | Avaliação enviada com sucesso!`,
                                                                                                                            ephemeral: true
                                                                                                                        });

                                                                                                                        // stop the collector (collectorRate)
                                                                                                                        await collectorRate.stop();

                                                                                                                    };

                                                                                                                });

                                                                                                            };

                                                                                                        });

                                                                                                        // end of time - collector
                                                                                                        collectorRate.on("end", async (c, r) => {
                                                                                                            if (r == "time") {

                                                                                                                // message - delete
                                                                                                                await msgRate.delete()
                                                                                                                    .catch((err) => {
                                                                                                                        return;
                                                                                                                    });

                                                                                                                // variables with information from the coupon used
                                                                                                                const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                                // cart payment date
                                                                                                                const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                                // variables with product information
                                                                                                                const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                                const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                                // variables with dbConfigs information
                                                                                                                const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                                const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                                // log - product sale
                                                                                                                const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                                if (channelLogsPublic) {
                                                                                                                    await channelLogsPublic.send({
                                                                                                                        content: `${interaction.user}`,
                                                                                                                        embeds: [new EmbedBuilder()
                                                                                                                            .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                            .addFields(
                                                                                                                                { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                                { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                                { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                                { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                                { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                                { name: `⭐ | AVALIAÇÃO:`, value: `\`Nenhuma Avaliação.\`` }
                                                                                                                            )
                                                                                                                            .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                                            .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                                            .setColor(`NotQuiteBlack`)
                                                                                                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                                        ]
                                                                                                                    });
                                                                                                                };

                                                                                                            };
                                                                                                        });

                                                                                                    });

                                                                                                };

                                                                                                // loop - close the cart - 1 minute
                                                                                                setTimeout(async (t) => {

                                                                                                    // delete the channel
                                                                                                    await channel.delete()
                                                                                                        .catch((err) => {

                                                                                                            // 10003 - code
                                                                                                            if (err.code == 10003) {
                                                                                                                return;
                                                                                                            } else {
                                                                                                                console.error(err);
                                                                                                                return;
                                                                                                            };

                                                                                                        });

                                                                                                }, 60000);

                                                                                            }).catch(async (err) => {

                                                                                                // channel - message - warning
                                                                                                await channel.send({
                                                                                                    content: `❌ | ${interaction.user}, Não foi possivel enviar os itens em sua DM.`
                                                                                                });

                                                                                                // channel - message - success
                                                                                                await channel.send({
                                                                                                    embeds: [new EmbedBuilder()
                                                                                                        .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                        .addFields(
                                                                                                            { name: `🛒 | Produto(s) Comprado(s):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                            { name: `📝 | ID da Compra:`, value: `${paymentId}` },
                                                                                                            { name: `⭐ | Obrigado por Comprar Conosco!`, value: `**${interaction.guild.name}** Agradece a sua Preferência.` },
                                                                                                        )
                                                                                                        .setThumbnail(thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                        .setImage(bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                        .setColor(`NotQuiteBlack`)
                                                                                                        .setFooter({ text: `Seu(s) Produto(s):` })
                                                                                                    ]
                                                                                                });

                                                                                                // promise - products - channel
                                                                                                let itensRemoved = ``;
                                                                                                let itensTotal = 0;
                                                                                                await Promise.all(
                                                                                                    allCarts.map(async (product) => {

                                                                                                        // get product ids
                                                                                                        const productIds = Object.keys(product.data.products);

                                                                                                        // separates each product id
                                                                                                        for (const pId of productIds) {

                                                                                                            // product array
                                                                                                            const purchaseDetails = product.data.products[pId];

                                                                                                            // variables with product information in the cart by dbOpenedCarts (wio.db)
                                                                                                            const purchaseName = purchaseDetails.productName;
                                                                                                            const purchasePrice = purchaseDetails.purchasePrice;
                                                                                                            const purchaseAmount = purchaseDetails.purchaseAmount;

                                                                                                            // variables with product information in the cart by dbProducts (wio.db)
                                                                                                            const estoqueP = await dbProducts.get(`${pId.replace(`p-`, ``)}.stock`);

                                                                                                            // product out of stock - error
                                                                                                            if (estoqueP < purchaseAmount) {
                                                                                                                await channel.send({
                                                                                                                    embeds: [new EmbedBuilder()
                                                                                                                        .setTitle(`${client.user.username} | Erro na Compra`)
                                                                                                                        .setDescription(`⚠ | Parece que alguém já adquiriu o produto: **${purchaseName}** antes de você, ${interaction.user}. Por favor, abra um ticket para relatar o problema.`)
                                                                                                                        .setColor(`Red`)
                                                                                                                        .setTimestamp()
                                                                                                                    ]
                                                                                                                });
                                                                                                                return;
                                                                                                            };

                                                                                                            // saves information in the user profile by dbProfile (wio.db)
                                                                                                            await dbProfiles.add(`${interaction.user.id}.ordersTotal`, 1);
                                                                                                            await dbProfiles.add(`${interaction.user.id}.paidsTotal`, Number(purchasePrice));
                                                                                                            await dbProfiles.set(`${interaction.user.id}.lastPurchase`, moment());

                                                                                                            // saves information in the product by dbProducts (wio.db)
                                                                                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.incomeTotal`, Number(purchasePrice));
                                                                                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.sellsTotal`, Number(purchaseAmount));

                                                                                                            // save new income at dbSales (wio.db)
                                                                                                            await dbSales.add(`${moment().format(`L`)}.requests`, 1);
                                                                                                            await dbSales.add(`${moment().format(`L`)}.receipts`, Number(purchasePrice));

                                                                                                            // removes and picks up product items by dbProducts (wio.db)
                                                                                                            const purchasedItems = await estoqueP.splice(0, Number(purchaseAmount));
                                                                                                            await dbProducts.set(`${pId.replace(`p-`, ``)}.stock`, estoqueP);

                                                                                                            // push variable with items purchased (txt)
                                                                                                            for (let i = 0; i < purchasedItems.length; i++) {
                                                                                                                itensRemoved += `\n📦 | Entrega do Produto: ${purchaseName} - ${i + 1}/${Number(purchaseAmount)}\n${purchasedItems[i]}\n`;
                                                                                                            };

                                                                                                            // add the total number of items in the variable
                                                                                                            itensTotal += Number(purchaseAmount);

                                                                                                        };

                                                                                                    }),
                                                                                                );

                                                                                                // set purchase items to dbPurchases (wio.db)
                                                                                                await dbPurchases.set(`${paymentId}.productsDelivered`, itensRemoved);

                                                                                                // checks if the number of products is less than or equal to 7
                                                                                                if (Number(itensTotal) <= 7) {

                                                                                                    // variables with information from the coupon used
                                                                                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                                    const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                                    // cart payment date
                                                                                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                    // log - cart time expired - channel
                                                                                                    const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                                    if (channelLogsPriv) {
                                                                                                        channelLogsPriv.send({
                                                                                                            embeds: [new EmbedBuilder()
                                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                .addFields(
                                                                                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${paymentId}\`` },
                                                                                                                    { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Pix - Site` },
                                                                                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`${itensRemoved}\`\`\`` }
                                                                                                                )
                                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                            ],
                                                                                                            components: [new ActionRowBuilder()
                                                                                                                .addComponents(
                                                                                                                    new ButtonBuilder().setCustomId(`refund-${paymentId}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`)
                                                                                                                )
                                                                                                            ]
                                                                                                        });
                                                                                                    };

                                                                                                    // channel - message - success - itens
                                                                                                    await channel.send({
                                                                                                        content: `${itensRemoved}`
                                                                                                    }).catch((async (err) => {

                                                                                                        // file name
                                                                                                        const fileName = `${paymentId}.txt`;

                                                                                                        // create the file and add the content
                                                                                                        writeFile(fileName, itensRemoved, (err) => {
                                                                                                            if (err) throw err;
                                                                                                        });

                                                                                                        // create the attachment
                                                                                                        const fileAttachment = new AttachmentBuilder(fileName);

                                                                                                        // channel - message - success - itens
                                                                                                        await channel.send({
                                                                                                            files: [fileAttachment]
                                                                                                        }).then((msg) => {

                                                                                                            // delete the file
                                                                                                            unlink(fileName, (err) => {
                                                                                                                if (err) throw err;
                                                                                                            });

                                                                                                        });

                                                                                                    }));

                                                                                                } else {

                                                                                                    // variables with information from the coupon used
                                                                                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                                                                                    const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                                                                                    // cart payment date
                                                                                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                    // file name
                                                                                                    const fileName = `${paymentId}.txt`;

                                                                                                    // create the file and add the content
                                                                                                    writeFile(fileName, itensRemoved, (err) => {
                                                                                                        if (err) throw err;
                                                                                                    });

                                                                                                    // create the attachment
                                                                                                    const fileAttachment = new AttachmentBuilder(fileName);

                                                                                                    // log - product
                                                                                                    const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                                                    if (channelLogsPriv) {
                                                                                                        channelLogsPriv.send({
                                                                                                            embeds: [new EmbedBuilder()
                                                                                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                .addFields(
                                                                                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${paymentId}\`` },
                                                                                                                    { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${interaction.user.id}\`` },
                                                                                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                                                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Pix - Site` },
                                                                                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                                                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`Produtos no TXT.\`\`\`` }
                                                                                                                )
                                                                                                                .setColor(`NotQuiteBlack`)
                                                                                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                            ],
                                                                                                            components: [new ActionRowBuilder()
                                                                                                                .addComponents(
                                                                                                                    new ButtonBuilder().setCustomId(`refund-${paymentId}`).setLabel(`Reembolsar`).setEmoji(`💳`).setStyle(`Primary`)
                                                                                                                )
                                                                                                            ],
                                                                                                            files: [fileAttachment]
                                                                                                        });
                                                                                                    };

                                                                                                    // channel - message - success - itens
                                                                                                    await channel.send({
                                                                                                        files: [fileAttachment]
                                                                                                    });

                                                                                                    // delete the file
                                                                                                    unlink(fileName, (err) => {
                                                                                                        if (err) throw err;
                                                                                                    });

                                                                                                };

                                                                                                // checks if the public logs channel exists
                                                                                                const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                if (channelLogsPublic) {

                                                                                                    // channel - message - rate
                                                                                                    await channel.send({
                                                                                                        embeds: [new EmbedBuilder()
                                                                                                            .setTitle(`${client.user.username} | Avaliação`)
                                                                                                            .setDescription(`Se desejar, escolha uma nota abaixo para a venda:`)
                                                                                                            .setColor(`NotQuiteBlack`)
                                                                                                        ],
                                                                                                        components: [new ActionRowBuilder()
                                                                                                            .addComponents(
                                                                                                                new ButtonBuilder().setCustomId(`1`).setLabel(`1`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                                new ButtonBuilder().setCustomId(`2`).setLabel(`2`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                                new ButtonBuilder().setCustomId(`3`).setLabel(`3`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                                new ButtonBuilder().setCustomId(`4`).setLabel(`4`).setEmoji(`⭐`).setStyle(`Secondary`),
                                                                                                                new ButtonBuilder().setCustomId(`5`).setLabel(`5`).setEmoji(`⭐`).setStyle(`Secondary`)
                                                                                                            )
                                                                                                        ]
                                                                                                    }).then(async (msgRate) => {

                                                                                                        // createMessageComponentCollector - collector
                                                                                                        const filter = (m) => m.user.id == interaction.user.id;
                                                                                                        const collectorRate = msgRate.createMessageComponentCollector({
                                                                                                            filter: filter,
                                                                                                            time: 60000
                                                                                                        });
                                                                                                        collectorRate.on("collect", async (iRate) => {

                                                                                                            // number of stars chosen - button
                                                                                                            const rateNumber = iRate.customId;
                                                                                                            if (iRate.customId == rateNumber) {

                                                                                                                // create the modal
                                                                                                                const modal = new ModalBuilder()
                                                                                                                    .setCustomId(`modalRate`)
                                                                                                                    .setTitle(`${`⭐`.repeat(rateNumber)} (${rateNumber})`)

                                                                                                                // creates the components for the modal
                                                                                                                const inputRateTxt = new TextInputBuilder()
                                                                                                                    .setCustomId('rateText')
                                                                                                                    .setLabel(`Avaliação: (opcional)`)
                                                                                                                    .setMaxLength(150)
                                                                                                                    .setPlaceholder(`Insira uma breve avaliação aqui ...`)
                                                                                                                    .setRequired(false)
                                                                                                                    .setStyle(`Paragraph`)

                                                                                                                // rows for components
                                                                                                                const iRateText = new ActionRowBuilder().addComponents(inputRateTxt);

                                                                                                                // add the rows to the modal
                                                                                                                modal.addComponents(iRateText);

                                                                                                                // open the modal
                                                                                                                await iRate.showModal(modal);

                                                                                                                // event - interactionCreate
                                                                                                                client.once("interactionCreate", async (iModal) => {

                                                                                                                    // modalRate - modal - submit
                                                                                                                    if (iModal.customId == `modalRate`) {

                                                                                                                        // message - delete
                                                                                                                        await msgRate.delete()
                                                                                                                            .catch((err) => {
                                                                                                                                return;
                                                                                                                            });

                                                                                                                        // variables with modal fields
                                                                                                                        const inserterRateText = iModal.fields.getTextInputValue(`rateText`) || `\`Nenhuma Avaliação.\``;

                                                                                                                        // variables with information from the coupon used
                                                                                                                        const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                                        // cart payment date
                                                                                                                        const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                                        // variables with product information
                                                                                                                        const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                                        const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                                        // variables with dbConfigs information
                                                                                                                        const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                                        const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                                        // log - product sale
                                                                                                                        const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                                        if (channelLogsPublic) {
                                                                                                                            await channelLogsPublic.send({
                                                                                                                                content: `${interaction.user}`,
                                                                                                                                embeds: [new EmbedBuilder()
                                                                                                                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                                    .addFields(
                                                                                                                                        { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                                        { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                                        { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                                        { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                                        { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                                        { name: `⭐ | AVALIAÇÃO:`, value: `${`⭐`.repeat(rateNumber)} (${rateNumber})\n**__${interaction.user.username}__**: ${inserterRateText}` }
                                                                                                                                    )
                                                                                                                                    .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                                                    .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                                                    .setColor(`NotQuiteBlack`)
                                                                                                                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                                                ]
                                                                                                                            });
                                                                                                                        };

                                                                                                                        // reply - success
                                                                                                                        await iModal.reply({
                                                                                                                            content: `✅ | Avaliação enviada com sucesso!`,
                                                                                                                            ephemeral: true
                                                                                                                        });

                                                                                                                        // stop the collector (collectorRate)
                                                                                                                        await collectorRate.stop();

                                                                                                                    };

                                                                                                                });

                                                                                                            };

                                                                                                        });

                                                                                                        // end of time - collector
                                                                                                        collectorRate.on("end", async (c, r) => {
                                                                                                            if (r == "time") {

                                                                                                                // message - delete
                                                                                                                await msgRate.delete()
                                                                                                                    .catch((err) => {
                                                                                                                        return;
                                                                                                                    });

                                                                                                                // variables with information from the coupon used
                                                                                                                const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;

                                                                                                                // cart payment date
                                                                                                                const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                                                                                                // variables with product information
                                                                                                                const thumbP = await dbProducts.get(`${productId}.thumbUrl`);
                                                                                                                const bannerP = await dbProducts.get(`${productId}.bannerUrl`);

                                                                                                                // variables with dbConfigs information
                                                                                                                const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                                const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                                // log - product sale
                                                                                                                const channelLogsPublic = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                                                                                if (channelLogsPublic) {
                                                                                                                    await channelLogsPublic.send({
                                                                                                                        content: `${interaction.user}`,
                                                                                                                        embeds: [new EmbedBuilder()
                                                                                                                            .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                                                                            .addFields(
                                                                                                                                { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                                                                { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                                                                                { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                                                                                { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                                                                                { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                                                                                { name: `⭐ | AVALIAÇÃO:`, value: `\`Nenhuma Avaliação.\`` }
                                                                                                                            )
                                                                                                                            .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                                            .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                                            .setColor(`NotQuiteBlack`)
                                                                                                                            .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                                                                                                        ]
                                                                                                                    });
                                                                                                                };

                                                                                                            };
                                                                                                        });

                                                                                                    });

                                                                                                };

                                                                                                // loop - close the cart - 10 minutes
                                                                                                setTimeout(async (t) => {

                                                                                                    // delete the channel
                                                                                                    await channel.delete()
                                                                                                        .catch((err) => {

                                                                                                            // 10003 - code
                                                                                                            if (err.code == 10003) {
                                                                                                                return;
                                                                                                            } else {
                                                                                                                console.error(err);
                                                                                                                return;
                                                                                                            };

                                                                                                        });

                                                                                                }, 600000);

                                                                                            });

                                                                                        });

                                                                                    // promise - products - update messages
                                                                                    await Promise.all(
                                                                                        allCarts.map(async (product) => {

                                                                                            // get product ids
                                                                                            const productIds = Object.keys(product.data.products);

                                                                                            // separates each product id
                                                                                            for (const pId of productIds) {

                                                                                                // get array with product information
                                                                                                const productNew = await dbProducts.get(pId.replace(`p-`, ``));

                                                                                                // variables with message/channel ids by dbProducts (wio.db)
                                                                                                const channelId = productNew.msgLocalization.channelId;
                                                                                                const messageId = productNew.msgLocalization.messageId;

                                                                                                // message channel
                                                                                                const channelMsg = await interaction.guild.channels.cache.get(channelId);

                                                                                                // purchase message
                                                                                                const msgFetched = await channelMsg.messages.cache.get(messageId);

                                                                                                // variables with product information
                                                                                                const nameP = productNew.name;
                                                                                                const descriptionP = productNew.description;
                                                                                                const thumbP = productNew.thumbUrl;
                                                                                                const bannerP = productNew.bannerUrl;
                                                                                                const colorP = productNew.color;
                                                                                                const priceP = productNew.price;
                                                                                                const estoqueP = productNew.stock;

                                                                                                // variables with dbConfigs information
                                                                                                const thumbC = await dbConfigs.get(`images.thumbUrl`);
                                                                                                const bannerC = await dbConfigs.get(`images.bannerUrl`);

                                                                                                // embed product
                                                                                                const embedProduct = new EmbedBuilder()
                                                                                                    .setTitle(`${client.user.username} | Produto`)
                                                                                                    .setDescription(`**\`\`\`${descriptionP}\`\`\`\n🌎 | Nome: ${nameP}\n💸 | Preço: R$__${Number(priceP).toFixed(2)}__\n📦 | Estoque: __${estoqueP.length}__**`)
                                                                                                    .setThumbnail(thumbP != "none" ? thumbP : thumbC != "none" ? thumbC : "https://sem-img.com")
                                                                                                    .setImage(bannerP != "none" ? bannerP : bannerC != "none" ? bannerC : "https://sem-img.com")
                                                                                                    .setColor(colorP != "none" ? colorP : `NotQuiteBlack`)

                                                                                                // update the purchase message (msgFetched)
                                                                                                await msgFetched.edit({
                                                                                                    embeds: [embedProduct]
                                                                                                }).catch((err) => {
                                                                                                    return;
                                                                                                });

                                                                                            };

                                                                                        }),
                                                                                    );

                                                                                };

                                                                            };

                                                                        };

                                                                        // cancelPayment - button
                                                                        if (iPreference.customId == `cancelPayment`) {

                                                                            // deferUpdate - postphone the update
                                                                            await iPreference.deferUpdate();

                                                                            // stop the loop - payment
                                                                            clearTimeout(loopClosePayment);

                                                                            // delete the product in dbOpenedCarts (wio.db)
                                                                            await dbOpenedCarts.delete(channel.id);

                                                                            // delete the channel
                                                                            await channel.delete()
                                                                                .catch((err) => {

                                                                                    // 10003 - code
                                                                                    if (err.code == 10003) {
                                                                                        return;
                                                                                    } else {
                                                                                        console.error(err);
                                                                                        return;
                                                                                    };

                                                                                });

                                                                            // log - closed cart
                                                                            const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                                            if (channelLogsPriv) {
                                                                                await channelLogsPriv.send({
                                                                                    embeds: [new EmbedBuilder()
                                                                                        .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                                                                        .setTitle(`${client.user.username} | Compra Cancelada`)
                                                                                        .addFields(
                                                                                            { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                                            { name: `📜 | Motivo:`, value: `Cancelada pelo comprador.` },
                                                                                            { name: `⏰ | Data & Horário:`, value: `${createdDate}` }
                                                                                        )
                                                                                        .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                                                                                        .setColor(`Red`)
                                                                                        .setTimestamp()
                                                                                    ]
                                                                                });
                                                                            };

                                                                            // stop the collector (collectorPreference)
                                                                            await collectorPreference.stop();

                                                                        };

                                                                    });

                                                                    // stop the collector (collectorCart3)
                                                                    await collectorCart3.stop();

                                                                }).catch(async (err) => {

                                                                    // message - edit - error
                                                                    await msgCart2.edit({
                                                                        content: `❌ | Ocorreu um erro ao gerar o pagamento.`,
                                                                        embeds: [],
                                                                        components: [],
                                                                        ephemeral: true
                                                                    });

                                                                    // loop - close the cart - 10 seconds
                                                                    setTimeout(async (t) => {

                                                                        // delete the channel
                                                                        await channel.delete()
                                                                            .catch((err) => {

                                                                                // 10003 - code
                                                                                if (err.code == 10003) {
                                                                                    return;
                                                                                } else {
                                                                                    console.error(err);
                                                                                    return;
                                                                                };

                                                                            });

                                                                    }, 10000);

                                                                    // delete the product in dbOpenedCarts (wio.db)
                                                                    await dbOpenedCarts.delete(channel.id);

                                                                    // log - error
                                                                    await console.error(err);

                                                                });

                                                        };

                                                        // cancelCart - button
                                                        if (iCart3.customId == `cancelCart`) {

                                                            // deferUpdate - postphone the update
                                                            await iCart3.deferUpdate();

                                                            // stop the loop - end
                                                            clearTimeout(loopCloseEnd);

                                                            // delete the product in dbOpenedCarts (wio.db)
                                                            await dbOpenedCarts.delete(channel.id);

                                                            // delete the channel
                                                            await channel.delete()
                                                                .catch((err) => {

                                                                    // 10003 - code
                                                                    if (err.code == 10003) {
                                                                        return;
                                                                    } else {
                                                                        console.error(err);
                                                                        return;
                                                                    };

                                                                });

                                                            // log - closed cart
                                                            const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                            if (channelLogsPriv) {
                                                                await channelLogsPriv.send({
                                                                    embeds: [new EmbedBuilder()
                                                                        .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                                                        .setTitle(`${client.user.username} | Compra Cancelada`)
                                                                        .addFields(
                                                                            { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                            { name: `📜 | Motivo:`, value: `Cancelada pelo comprador.` },
                                                                            { name: `⏰ | Data & Horário:`, value: `${createdDate}` }
                                                                        )
                                                                        .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                                                                        .setColor(`Red`)
                                                                        .setTimestamp()
                                                                    ]
                                                                });
                                                            };

                                                            // stop the collector (collectorCart3)
                                                            await collectorCart3.stop();

                                                        };

                                                    });

                                                };

                                            };

                                            // addCoupon - button
                                            if (iCart2.customId == `addCoupon`) {

                                                // deferUpdate - postphone the update
                                                await iCart2.deferUpdate();

                                                // message - edit - disable coupon button
                                                await msgCart2.edit({
                                                    content: `${interaction.user}`,
                                                    embeds: [embedResumeProduct],
                                                    components: [new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`toPayment`).setLabel(`Ir para o Pagamento`).setEmoji(`✅`).setStyle(`Success`).setDisabled(true),
                                                            new ButtonBuilder().setCustomId(`addCoupon`).setLabel(`Adicionar Cupom de Desconto`).setEmoji(`🎁`).setStyle(`Primary`).setDisabled(true),
                                                            new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`).setDisabled(true)
                                                        )
                                                    ]
                                                });

                                                // message - send - channel
                                                const msgSendCoupon = await channel.send({
                                                    embeds: [new EmbedBuilder()
                                                        .setTitle(`${client.user.username} | Cupom de Desconto`)
                                                        .setDescription(`Envie o cupom de desconto que será utilizado!`)
                                                        .setFooter({ text: `Você tem 2 minutos para enviar.` })
                                                        .setColor(`NotQuiteBlack`)
                                                    ],
                                                    components: []
                                                });

                                                // createMessageCollector - collector
                                                const collectorMsg = channel.createMessageCollector({
                                                    filter: (m) => m.author.id == interaction.user.id,
                                                    max: 1,
                                                    time: 120000 // 2 minutes
                                                });
                                                collectorMsg.on("collect", async (iMsg) => {

                                                    // delete the message (iMsg)
                                                    await iMsg.delete();

                                                    // message (trim)
                                                    const msgContent = iMsg.content.trim();

                                                    // checks if the inserted coupon exists in dbCoupons (wio.db)
                                                    if (!dbCoupons.has(msgContent)) {

                                                        // delete the message (msgSendCoupon)
                                                        await msgSendCoupon.delete();

                                                        // variables with information from the coupon used by dbOpenedCarts (wio.db)
                                                        const couponId = await dbOpenedCarts.get(`${channel.id}.purchaseCoupon.couponId`);

                                                        // row product(s) - resume
                                                        const rowResumeProduct = new ActionRowBuilder()
                                                            .addComponents(
                                                                new ButtonBuilder().setCustomId(`toPayment`).setLabel(`Ir para o Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                                new ButtonBuilder().setCustomId(`addCoupon`).setLabel(`Adicionar Cupom de Desconto`).setEmoji(`🎁`).setStyle(`Primary`),
                                                                new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                                            );

                                                        // embed product(s) - resume
                                                        const embedResumeProduct = new EmbedBuilder()
                                                            .setTitle(`${client.user.username} | Carrinho de Compras`)
                                                            .setDescription(`**${allProducts.join(`\n\n`)}\n\n🛒 | Produtos no Carrinho: \`${allProducts.length}\`\n💸 | Total a Pagar: \`R$${Number(totalPrice).toFixed(2)}\`\n📜 | Cupom Adicionado: \`${couponId == "none" ? `Sem cupom.` : couponId}\`**`)
                                                            .setColor(`NotQuiteBlack`);

                                                        // message - edit
                                                        await msgCart2.edit({
                                                            content: `${interaction.user}`,
                                                            embeds: [embedResumeProduct],
                                                            components: [rowResumeProduct]
                                                        }).catch(async (err) => {
                                                            return;
                                                        });

                                                        // message - error
                                                        await iCart2.followUp({
                                                            content: `❌ | O cupom inserido não foi encontrado!`,
                                                            ephemeral: true
                                                        });

                                                        return;
                                                    };

                                                    // check if the coupon is in stock
                                                    const oCouponStock = await dbCoupons.get(`${msgContent}.stock`);
                                                    if (Number(oCouponStock) < 1) {

                                                        // delete the message (msgSendCoupon)
                                                        await msgSendCoupon.delete();

                                                        // variables with information from the coupon used by dbOpenedCarts (wio.db)
                                                        const couponId = await dbOpenedCarts.get(`${channel.id}.purchaseCoupon.couponId`);

                                                        // row product(s) - resume
                                                        const rowResumeProduct = new ActionRowBuilder()
                                                            .addComponents(
                                                                new ButtonBuilder().setCustomId(`toPayment`).setLabel(`Ir para o Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                                new ButtonBuilder().setCustomId(`addCoupon`).setLabel(`Adicionar Cupom de Desconto`).setEmoji(`🎁`).setStyle(`Primary`),
                                                                new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                                            );

                                                        // embed product(s) - resume
                                                        const embedResumeProduct = new EmbedBuilder()
                                                            .setTitle(`${client.user.username} | Carrinho de Compras`)
                                                            .setDescription(`**${allProducts.join(`\n\n`)}\n\n🛒 | Produtos no Carrinho: \`${allProducts.length}\`\n💸 | Total a Pagar: \`R$${Number(totalPrice).toFixed(2)}\`\n📜 | Cupom Adicionado: \`${couponId == "none" ? `Sem cupom.` : couponId}\`**`)
                                                            .setColor(`NotQuiteBlack`);

                                                        // message - edit
                                                        await msgCart2.edit({
                                                            content: `${interaction.user}`,
                                                            embeds: [embedResumeProduct],
                                                            components: [rowResumeProduct]
                                                        }).catch(async (err) => {
                                                            return;
                                                        });

                                                        // message - error
                                                        await iCart2.followUp({
                                                            content: `⚠ | O cupom inserido está esgotado!`,
                                                            ephemeral: true
                                                        });

                                                        return;
                                                    };

                                                    // checks if the minimum purchase value of the coupon is not equal to 0
                                                    const roleCoupon = await dbCoupons.get(`${msgContent}.role`);
                                                    if (roleCoupon != `none`) {

                                                        // checks if the user has the position requested in the coupon
                                                        const roleGuild = iCart2.guild.roles.cache.get(roleCoupon);
                                                        if (roleGuild) {

                                                            // search for user profile on the guild
                                                            const memberGuild = iCart2.guild.members.cache.get(interaction.user.id);

                                                            // checks if the user has the role
                                                            if (!memberGuild.roles.cache.has(roleGuild.id)) {

                                                                // delete the message (msgSendCoupon)
                                                                await msgSendCoupon.delete();

                                                                // variables with information from the coupon used by dbOpenedCarts (wio.db)
                                                                const couponId = await dbOpenedCarts.get(`${channel.id}.purchaseCoupon.couponId`);

                                                                // row product(s) - resume
                                                                const rowResumeProduct = new ActionRowBuilder()
                                                                    .addComponents(
                                                                        new ButtonBuilder().setCustomId(`toPayment`).setLabel(`Ir para o Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                                        new ButtonBuilder().setCustomId(`addCoupon`).setLabel(`Adicionar Cupom de Desconto`).setEmoji(`🎁`).setStyle(`Primary`),
                                                                        new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                                                    );

                                                                // embed product(s) - resume
                                                                const embedResumeProduct = new EmbedBuilder()
                                                                    .setTitle(`${client.user.username} | Carrinho de Compras`)
                                                                    .setDescription(`**${allProducts.join(`\n\n`)}\n\n🛒 | Produtos no Carrinho: \`${allProducts.length}\`\n💸 | Total a Pagar: \`R$${Number(totalPrice).toFixed(2)}\`\n📜 | Cupom Adicionado: \`${couponId == "none" ? `Sem cupom.` : couponId}\`**`)
                                                                    .setColor(`NotQuiteBlack`);

                                                                // message - edit
                                                                await msgCart2.edit({
                                                                    content: `${interaction.user}`,
                                                                    embeds: [embedResumeProduct],
                                                                    components: [rowResumeProduct]
                                                                }).catch(async (err) => {
                                                                    return;
                                                                });

                                                                // message - error
                                                                await iCart2.followUp({
                                                                    content: `⚠ | Para utilizar este cupom, é necessário possuir o cargo: ${roleGuild}.`,
                                                                    ephemeral: true
                                                                });

                                                                return;
                                                            };

                                                        };

                                                    };

                                                    // checks if the minimum purchase value of the coupon is not equal to 0
                                                    const minimumPurchaseCoupon = await dbCoupons.get(`${msgContent}.minimumPurchase`);
                                                    if (minimumPurchaseCoupon != `none`) {

                                                        // checks if the total cart value is less than the minimum coupon value
                                                        if (totalPrice < Number(minimumPurchaseCoupon).toFixed(2)) {

                                                            // delete the message (msgSendCoupon)
                                                            await msgSendCoupon.delete();

                                                            // variables with information from the coupon used by dbOpenedCarts (wio.db)
                                                            const couponId = await dbOpenedCarts.get(`${channel.id}.purchaseCoupon.couponId`);

                                                            // row product(s) - resume
                                                            const rowResumeProduct = new ActionRowBuilder()
                                                                .addComponents(
                                                                    new ButtonBuilder().setCustomId(`toPayment`).setLabel(`Ir para o Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                                    new ButtonBuilder().setCustomId(`addCoupon`).setLabel(`Adicionar Cupom de Desconto`).setEmoji(`🎁`).setStyle(`Primary`),
                                                                    new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                                                );

                                                            // embed product(s) - resume
                                                            const embedResumeProduct = new EmbedBuilder()
                                                                .setTitle(`${client.user.username} | Carrinho de Compras`)
                                                                .setDescription(`**${allProducts.join(`\n\n`)}\n\n🛒 | Produtos no Carrinho: \`${allProducts.length}\`\n💸 | Total a Pagar: \`R$${Number(totalPrice).toFixed(2)}\`\n📜 | Cupom Adicionado: \`${couponId == "none" ? `Sem cupom.` : couponId}\`**`)
                                                                .setColor(`NotQuiteBlack`);

                                                            // message - edit
                                                            await msgCart2.edit({
                                                                content: `${interaction.user}`,
                                                                embeds: [embedResumeProduct],
                                                                components: [rowResumeProduct]
                                                            }).catch(async (err) => {
                                                                return;
                                                            });

                                                            // message - error
                                                            await iCart2.followUp({
                                                                content: `⚠ | O valor mínimo de compra para aplicar este cupom é de \`R$${Number(minimumPurchaseCoupon).toFixed(2)}\`.`,
                                                                ephemeral: true
                                                            });

                                                            return;
                                                        };

                                                    };

                                                    // subtract 1 coupon from stock by dbCoupons (wio.db)
                                                    await dbCoupons.substr(`${msgContent}.stock`, 1);

                                                    // delete the message (msgSendCoupon)
                                                    await msgSendCoupon.delete();

                                                    // variables with information from the coupon by dbCoupons (wio.db)
                                                    const oCouponDiscount = await dbCoupons.get(`${msgContent}.discount`);

                                                    // pull the discount coupon to the variable
                                                    couponUsed = msgContent;

                                                    // arrow the coupon by dbOpenedCarts (wio.db)
                                                    await dbOpenedCarts.set(`${channel.id}.purchaseCoupon.couponId`, msgContent);
                                                    await dbOpenedCarts.set(`${channel.id}.purchaseCoupon.couponDiscount`, oCouponDiscount);

                                                    // variables with information from the coupon used by dbOpenedCarts (wio.db)
                                                    const pCouponId = await dbOpenedCarts.get(`${channel.id}.purchaseCoupon.couponId`);
                                                    const pCouponDiscount = await dbOpenedCarts.get(`${channel.id}.purchaseCoupon.couponDiscount`);

                                                    // transform variables to numbers and round to avoid inaccuracies
                                                    const discountPrice = Math.round((Number(pCouponDiscount) / 100) * Number(totalPrice) * 100) / 100;

                                                    // add the discount to the total price and round
                                                    totalPrice = Math.round(Number(totalPrice) * (1 - Number(pCouponDiscount) / 100) * 100) / 100;

                                                    // adds the discount amount and percentage - coupon
                                                    couponValue = `R$${Number(discountPrice).toFixed(2)} - ${pCouponDiscount}%`;

                                                    // row product(s) - resume
                                                    const rowResumeProduct = new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`toPayment`).setLabel(`Ir para o Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                            new ButtonBuilder().setCustomId(`addCoupon`).setLabel(`Adicionar Cupom de Desconto`).setEmoji(`🎁`).setStyle(`Primary`).setDisabled(true),
                                                            new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                                        );

                                                    // embed product(s) - resume
                                                    const embedResumeProduct = new EmbedBuilder()
                                                        .setTitle(`${client.user.username} | Carrinho de Compras`)
                                                        .setDescription(`**${allProducts.join(`\n\n`)}\n\n🛒 | Produtos no Carrinho: \`${allProducts.length}\`\n💸 | Total a Pagar: \`R$${Number(totalPrice).toFixed(2)}\`\n📜 | Cupom Adicionado: \`${pCouponId == "none" ? `Sem cupom.` : pCouponId}\`\n🎉 | Valor do Desconto: \`R$${Number(discountPrice).toFixed(2)} - ${pCouponDiscount}%\`**`)
                                                        .setColor(`NotQuiteBlack`);

                                                    // message - edit
                                                    await msgCart2.edit({
                                                        content: `${interaction.user}`,
                                                        embeds: [embedResumeProduct],
                                                        components: [rowResumeProduct]
                                                    }).catch(async (err) => {
                                                        return;
                                                    });

                                                    // message - success
                                                    await iCart2.followUp({
                                                        content: `✅ | O cupom de desconto foi aplicado com sucesso!`,
                                                        ephemeral: true
                                                    });

                                                });

                                                // end of time - collector (collectorMsg)
                                                collectorMsg.on("end", async (c, r) => {
                                                    if (r == "time") {

                                                        // delete the message (msgSendCoupon)
                                                        await msgSendCoupon.delete();

                                                        // variables with information from the coupon used by dbOpenedCarts (wio.db)
                                                        const couponId = await dbOpenedCarts.get(`${channel.id}.purchaseCoupon.couponId`);

                                                        // row product(s) - resume
                                                        const rowResumeProduct = new ActionRowBuilder()
                                                            .addComponents(
                                                                new ButtonBuilder().setCustomId(`toPayment`).setLabel(`Ir para o Pagamento`).setEmoji(`✅`).setStyle(`Success`),
                                                                new ButtonBuilder().setCustomId(`addCoupon`).setLabel(`Adicionar Cupom de Desconto`).setEmoji(`🎁`).setStyle(`Primary`),
                                                                new ButtonBuilder().setCustomId(`cancelCart`).setLabel(`Cancelar Compra`).setEmoji(`❌`).setStyle(`Danger`)
                                                            );

                                                        // embed product(s) - resume
                                                        const embedResumeProduct = new EmbedBuilder()
                                                            .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                                            .setTitle(`${client.user.username} | Carrinho de Compras`)
                                                            .setDescription(`**${allProducts.join(`\n\n`)}\n\n🛒 | Produtos no Carrinho: \`${allProducts.length}\`\n💸 | Total a Pagar: \`R$${Number(totalPrice).toFixed(2)}\`\n📜 | Cupom Adicionado: \`${couponId == "none" ? `Sem cupom.` : couponId}.\`*`)
                                                            .setColor(`NotQuiteBlack`);

                                                        // message - edit
                                                        await msgCart2.edit({
                                                            content: `${interaction.user}`,
                                                            embeds: [embedResumeProduct],
                                                            components: [rowResumeProduct]
                                                        }).catch(async (err) => {
                                                            return;
                                                        });

                                                    };
                                                });

                                            };

                                            // cancelCart - button
                                            if (iCart2.customId == `cancelCart`) {

                                                // deferUpdate - postphone the update
                                                await iCart2.deferUpdate();

                                                // stop the loop - end
                                                clearTimeout(loopCloseEnd);

                                                // delete the product in dbOpenedCarts (wio.db)
                                                await dbOpenedCarts.delete(channel.id);

                                                // delete the channel
                                                await channel.delete()
                                                    .catch((err) => {

                                                        // 10003 - code
                                                        if (err.code == 10003) {
                                                            return;
                                                        } else {
                                                            console.error(err);
                                                            return;
                                                        };

                                                    });

                                                // log - closed cart
                                                const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                                if (channelLogsPriv) {
                                                    await channelLogsPriv.send({
                                                        embeds: [new EmbedBuilder()
                                                            .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                                            .setTitle(`${client.user.username} | Compra Cancelada`)
                                                            .addFields(
                                                                { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                                { name: `📜 | Motivo:`, value: `Cancelada pelo comprador.` },
                                                                { name: `⏰ | Data & Horário:`, value: `${createdDate}` }
                                                            )
                                                            .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                                                            .setColor(`Red`)
                                                            .setTimestamp()
                                                        ]
                                                    });
                                                };

                                                // stop the collector (collectorCart2)
                                                await collectorCart2.stop();

                                                // stop the collector (collectorProduct)
                                                await collectorProduct.stop();

                                            };

                                        });

                                        // stop the collector (collectorCart1)
                                        await collectorCart1.stop();

                                    }).catch(async (err) => {

                                        // stop the loop - home
                                        clearTimeout(loopCloseHome);

                                        // delete the product in dbOpenedCarts (wio.db)
                                        await dbOpenedCarts.delete(channel.id);

                                        // delete - channel
                                        await channel.delete();

                                        return;
                                    });

                            };

                            // viewTerms - button
                            if (iCart.customId == `viewTerms`) {

                                // deferUpdate - postphone the update
                                await iCart.deferUpdate();

                                // terms purchase
                                const termsPurchase = await dbConfigs.get(`termsPurchase`);

                                // embed terms
                                const embedTerms = new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Termos`)
                                    .setDescription(termsPurchase != "none" ? termsPurchase : "Não configurado.")
                                    .setColor(`NotQuiteBlack`);

                                // message - terms
                                await iCart.followUp({
                                    embeds: [embedTerms],
                                    ephemeral: true
                                });

                            };

                            // cancelCart - button
                            if (iCart.customId == `cancelCart`) {

                                // deferUpdate - postphone the update
                                await iCart.deferUpdate();

                                // stop the loop - home
                                clearTimeout(loopCloseHome);

                                // delete the product in dbOpenedCarts (wio.db)
                                await dbOpenedCarts.delete(channel.id);

                                // delete the channel
                                await channel.delete()
                                    .catch((err) => {

                                        // 10003 - code
                                        if (err.code == 10003) {
                                            return;
                                        } else {
                                            console.error(err);
                                            return;
                                        };

                                    });

                                // log - closed cart
                                const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                if (channelLogsPriv) {
                                    await channelLogsPriv.send({
                                        embeds: [new EmbedBuilder()
                                            .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                            .setTitle(`${client.user.username} | Compra Cancelada`)
                                            .addFields(
                                                { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                                { name: `📜 | Motivo:`, value: `Cancelada pelo comprador.` },
                                                { name: `⏰ | Data & Horário:`, value: `${createdDate}` }
                                            )
                                            .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                                            .setColor(`Red`)
                                            .setTimestamp()
                                        ]
                                    });
                                };

                                // stop the collector (collectorCart1)
                                await collectorCart1.stop();

                                // stop the collector (collectorProduct)
                                await collectorProduct.stop();

                            };

                        });

                        // log - opened cart
                        const channelLogsPriv = interaction.guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                        if (channelLogsPriv) {
                            await channelLogsPriv.send({
                                embeds: [new EmbedBuilder()
                                    .setAuthor({ name: `${interaction.user.username} - ${interaction.user.id}`, iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                    .setTitle(`${client.user.username} | Carrinho Criado`)
                                    .addFields(
                                        { name: `👤 | COMPRADOR(A):`, value: `${interaction.user} | ${interaction.user.username}` },
                                        { name: `🌎 | Produto:`, value: `${product.name} x1` },
                                        { name: `⏰ | Data & Horário:`, value: `${createdDate}` }
                                    )
                                    .setThumbnail(interaction.user.avatarURL({ dynamic: true }))
                                    .setColor(`Green`)
                                    .setTimestamp()
                                ]
                            });
                        };

                        // editReply - success
                        await interaction.editReply({
                            content: ``,
                            embeds: [new EmbedBuilder()
                                .setTitle(`${client.user.username} | Carrinho Criado`)
                                .setDescription(`✅ | ${interaction.user} Seu carrinho foi aberto com sucesso em: ${channel}. Sinta-se à vontade para incluir mais produtos!`)
                                .setColor('Green')
                            ],
                            components: [new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setLabel(`Ir para o Carrinho`).setEmoji(`🛒`).setStyle(`Link`).setURL(channel.url)
                                )
                            ],
                            ephemeral: true
                        });

                    }).catch(async (err) => {

                        // log - error
                        await console.error(err);

                    });

                });

            };

        };

    },
};