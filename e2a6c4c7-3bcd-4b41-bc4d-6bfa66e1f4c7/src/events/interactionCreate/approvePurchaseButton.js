// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");

// fs - files
const { writeFile, unlink } = require("node:fs");

// moment - date and time
const moment = require("moment");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbProducts = new JsonDatabase({ databasePath: "./databases/dbProducts.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });
const dbProfiles = new JsonDatabase({ databasePath: "./databases/dbProfiles.json" });
const dbPurchases = new JsonDatabase({ databasePath: "./databases/dbPurchases.json" });
const dbOpenedCarts = new JsonDatabase({ databasePath: "./databases/dbOpenedCarts.json" });

// event
module.exports = {
    name: "interactionCreate",
    async execute(interaction, client) {

        // isButton
        if (interaction.isButton()) {

            // approvePurchase - button
            const buttonId = interaction.customId;

            // pixKey - button
            if (buttonId == `pixKey`) {

                // deferUpdate - postphone the update
                await interaction.deferUpdate();

                // variables with informations of semi-auto
                const semiAutoPix = await dbConfigs.get(`semiAuto.pix.key`);
                const semiAutoPixType = await dbConfigs.get(`semiAuto.pix.keyType`);

                // checks if the pix key set is equal to none
                if (semiAutoPix == `none`) {
                    await interaction.followUp({
                        content: `❌ | Não Disponível.`,
                        ephemeral: true
                    });
                    return;
                };

                // embed - pixKey
                const embedPixKey = new EmbedBuilder()
                    .setTitle(`${client.user.username} | Chave PIX`)
                    .addFields(
                        { name: `💠 | Chave PIX:`, value: `${semiAutoPix}` },
                        { name: `📝 | Tipo de Chave PIX:`, value: `${semiAutoPixType}` }
                    )
                    .setColor(`NotQuiteBlack`)
                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                // message - information
                await interaction.followUp({
                    embeds: [embedPixKey],
                    components: [new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`mobilePix`).setLabel(`Mobile`).setEmoji(`📱`).setStyle(`Primary`)
                        )
                    ],
                    ephemeral: true
                });

            };

            // pixKey - mobilePix - button - global
            if (buttonId == `mobilePix`) {

                // deferUpdate - postphone the update
                await interaction.deferUpdate();

                // variables with informations of semi-auto
                const semiAutoPix = await dbConfigs.get(`semiAuto.pix.key`);

                // message - pix - mobile
                await interaction.followUp({
                    content: `${semiAutoPix}`,
                    ephemeral: true
                });

            };

            // qrCode - button
            if (buttonId == `qrCode`) {

                // deferUpdate - postphone the update
                await interaction.deferUpdate();

                // variables with informations of semi-auto
                const semiAutoQRCode = await dbConfigs.get(`semiAuto.qrCode`);

                // checks if the pix key set is equal to none
                if (semiAutoQRCode == `none`) {
                    await interaction.followUp({
                        content: `❌ | Não Disponível.`,
                        ephemeral: true
                    });
                    return;
                };

                // embed - qr code
                const embedQrCode = new EmbedBuilder()
                    .setTitle(`${client.user.username} | QR Code`)
                    .setColor(`NotQuiteBlack`)
                    .setImage(semiAutoQRCode)
                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` });

                // message - information
                await interaction.followUp({
                    embeds: [embedQrCode],
                    ephemeral: true
                });

            };

            // cancelPaymentManual - button
            if (buttonId.startsWith(`cancelPaymentManual`)) {

                // deferUpdate - postphone the update
                await interaction.deferUpdate();

                // extracts the user ID from the button identifier
                const [_, userId] = buttonId.split('-');

                // guild - interaction
                const guild = interaction.guild;

                // user - buyer
                const buyer = await guild.members.cache.get(userId).user;

                // channel - interaction
                const channel = interaction.channel;

                // delete the product in dbOpenedCarts (wio.db)
                await dbOpenedCarts.delete(channel.id);

                // delete the channel
                await channel.delete()
                    .catch((err) => {
                        return;
                    });

                // closed - date
                const closedDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                // log - closed cart
                const channelLogsPriv = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                if (channelLogsPriv) {
                    await channelLogsPriv.send({
                        embeds: [new EmbedBuilder()
                            .setAuthor({ name: buyer ? `${buyer.username} - ${buyer.id}` : ` `, iconURL: buyer ? buyer.avatarURL({ dynamic: true }) : `https://sem-img.com` })
                            .setTitle(`${client.user.username} | Compra Cancelada`)
                            .addFields(
                                { name: `👤 | COMPRADOR(A):`, value: buyer ? `${buyer} | ${buyer.username}` : `Não encontrado.` },
                                { name: `📜 | Motivo:`, value: `Cancelada por **${interaction.user.username}**.` },
                                { name: `⏰ | Data & Horário:`, value: `${closedDate}` }
                            )
                            .setThumbnail(buyer.avatarURL({ dynamic: true }))
                            .setColor(`Red`)
                            .setTimestamp()
                        ]
                    });
                };

            };

            // approvePurchase - button
            if (buttonId.startsWith(`approvePurchase`)) {

                // deferUpdate - postphone the update
                await interaction.deferUpdate();

                // extracts the user ID from the button identifier
                const [_, userId, productId, couponValue, couponUsed] = buttonId.split('-');

                // guild - interaction
                const guild = interaction.guild;

                // user - buyer
                const buyer = await guild.members.cache.get(userId).user;

                // buyer not found
                if (!buyer) {
                    await interaction.followUp({
                        content: `❌ | O comprador não foi encontrado. Por tanto, não é possivel aprovar está compra!`,
                        ephemeral: true
                    });
                    return;
                };

                // channel - interaction
                const channel = interaction.channel;

                // try catch - purchase
                try {

                    // user without permission for dbPerms (wio.db)
                    if (!dbPerms.has(interaction.user.id)) {
                        await interaction.followUp({
                            content: `❌ | Você não tem permissão para aprovar está compra.`,
                            ephemeral: true
                        });
                        return;
                    };

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
                                        title: `${productName} - ${buyer.username}`,
                                        picture_url: client.user.avatarURL(),
                                        quantity: Number(purchaseAmount),
                                        currency_id: `BRL`,
                                        unit_price: Number(productPrice)
                                    }
                                );

                            };

                        }),
                    );

                    // defines permissions for the role in the channel
                    await channel.permissionOverwrites.edit(buyer.id, {
                        ViewChannel: true,
                        SendMessages: false,
                        AttachFiles: false
                    });

                    // delete the product in dbOpenedCarts (wio.db)
                    await dbOpenedCarts.delete(channel.id);

                    // clear messages - channel
                    await channel.bulkDelete(100)
                        .then(async (map) => {

                            // generates a random ID for purchases via balance
                            const dataPaymentId = Math.floor(Math.random() * 900000000) + 100000000;

                            // checks if the role of the product is not equal to 0
                            const roleProduct = await dbProducts.get(`${productId}.role`);
                            if (roleProduct != `none`) {

                                // checks if the user has the position requested in the coupon
                                const roleGuild = guild.roles.cache.get(roleProduct);
                                if (roleGuild) {

                                    // search for user profile on the guild
                                    const memberGuild = guild.members.cache.get(buyer.id) || `\`${roleProduct}\` não encontrado.`;

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
                                    const roleGuild = guild.roles.cache.get(roleConfig);
                                    if (roleGuild) {

                                        // search for user profile on the guild
                                        const memberGuild = guild.members.cache.get(buyer.id) || `\`${roleProduct}\` não encontrado.`;

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
                            await dbPurchases.set(`${dataPaymentId}.id`, dataPaymentId);
                            await dbPurchases.set(`${dataPaymentId}.productsIds`, allProductsIds);
                            await dbPurchases.set(`${dataPaymentId}.productsNames`, allProductsNames);
                            await dbPurchases.set(`${dataPaymentId}.pricePaid`, Number(totalPrice).toFixed(2));
                            await dbPurchases.set(`${dataPaymentId}.buyer`, buyer.id);
                            await dbPurchases.set(`${dataPaymentId}.date`, moment());

                            // channel - message - success
                            await channel.send({
                                content: `🎉 | Pagamento Aprovado!\n📝 | ID da compra: **${dataPaymentId}**`
                            });

                            // variables with dbConfigs information
                            const thumbC = await dbConfigs.get(`images.thumbUrl`);
                            const bannerC = await dbConfigs.get(`images.bannerUrl`);

                            // user - message - success
                            await buyer.send({
                                embeds: [new EmbedBuilder()
                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                    .addFields(
                                        { name: `🛒 | Produto(s) Comprado(s):`, value: `${allProductsNames.join(`\n`)}` },
                                        { name: `📝 | ID da Compra:`, value: `${dataPaymentId}` },
                                        { name: `⭐ | Obrigado por Comprar Conosco!`, value: `**__${guild.name}__** Agradece a sua Preferência.` },
                                    )
                                    .setThumbnail(thumbC != "none" ? thumbC : "https://sem-img.com")
                                    .setImage(bannerC != "none" ? bannerC : "https://sem-img.com")
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                ]
                            }).then(async (msg) => {

                                // channel - message - success 
                                const DMBot = await buyer.createDM();
                                await channel.send({
                                    embeds: [new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Pagamento Aprovado`)
                                        .setDescription(`${buyer} Verifique sua DM.`)
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
                                                        .setDescription(`⚠ | Parece que alguém já adquiriu o produto: **${purchaseName}** antes de você, ${buyer}. Por favor, abra um ticket para relatar o problema.`)
                                                        .setColor(`Red`)
                                                        .setTimestamp()
                                                    ]
                                                });
                                                return;
                                            };

                                            // saves information in the user profile by dbProfile (wio.db)
                                            await dbProfiles.add(`${buyer.id}.ordersTotal`, 1);
                                            await dbProfiles.add(`${buyer.id}.paidsTotal`, Number(purchasePrice));
                                            await dbProfiles.set(`${buyer.id}.lastPurchase`, moment());

                                            // saves information in the product by dbProducts (wio.db)
                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.incomeTotal`, Number(purchasePrice));
                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.sellsTotal`, Number(purchaseAmount));

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
                                await dbPurchases.set(`${dataPaymentId}.productsDelivered`, itensRemoved);

                                // checks if the number of products is less than or equal to 7
                                if (Number(itensTotal) <= 7) {

                                    // variables with information from the coupon used
                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                    const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                    // cart payment date
                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                    // log - cart time expired - channel
                                    const channelLogsPriv = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                    if (channelLogsPriv) {
                                        channelLogsPriv.send({
                                            embeds: [new EmbedBuilder()
                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                .addFields(
                                                    { name: `🔎 | APROVADA POR:`, value: `${buyer} | ${buyer.username}` },
                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${dataPaymentId}\`` },
                                                    { name: `👤 | COMPRADOR(A):`, value: `${buyer} | ${buyer.username}` },
                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${buyer.id}\`` },
                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Aprovação Manual` },
                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`${itensRemoved}\`\`\`` }
                                                )
                                                .setColor(`NotQuiteBlack`)
                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                            ]
                                        });
                                    };

                                    // user - message - success - itens
                                    await buyer.send({
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
                                        await buyer.send({
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
                                    const channelLogsPriv = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                    if (channelLogsPriv) {
                                        channelLogsPriv.send({
                                            embeds: [new EmbedBuilder()
                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                .addFields(
                                                    { name: `🔎 | APROVADA POR:`, value: `${buyer} | ${buyer.username}` },
                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${dataPaymentId}\`` },
                                                    { name: `👤 | COMPRADOR(A):`, value: `${buyer} | ${buyer.username}` },
                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${buyer.id}\`` },
                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Aprovação Manual` },
                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`Produtos no TXT.\`\`\`` }
                                                )
                                                .setColor(`NotQuiteBlack`)
                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
                                            ],
                                            files: [fileAttachment]
                                        });
                                    };

                                    // user - message - success - itens
                                    await buyer.send({
                                        files: [fileAttachment]
                                    });

                                    // delete the file
                                    unlink(fileName, (err) => {
                                        if (err) throw err;
                                    });

                                };

                                // checks if the public logs channel exists
                                const channelLogsPublic = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                if (channelLogsPublic) {

                                    // user - message - rate
                                    await buyer.send({
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
                                        const filter = (m) => m.buyer.id == buyer.id;
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
                                                        const channelLogsPublic = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                        if (channelLogsPublic) {
                                                            await channelLogsPublic.send({
                                                                content: `${buyer}`,
                                                                embeds: [new EmbedBuilder()
                                                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                    .addFields(
                                                                        { name: `👤 | COMPRADOR(A):`, value: `${buyer} | ${buyer.username}` },
                                                                        { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                        { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                        { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                        { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                        { name: `⭐ | AVALIAÇÃO:`, value: `${`⭐`.repeat(rateNumber)} (${rateNumber})\n**__${buyer.username}__**: ${inserterRateText}` }
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
                                                const channelLogsPublic = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                if (channelLogsPublic) {
                                                    await channelLogsPublic.send({
                                                        content: `${buyer}`,
                                                        embeds: [new EmbedBuilder()
                                                            .setTitle(`${client.user.username} | Compra Aprovada`)
                                                            .addFields(
                                                                { name: `👤 | COMPRADOR(A):`, value: `${buyer} | ${buyer.username}` },
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
                                    content: `❌ | ${buyer}, Não foi possivel enviar os itens em sua DM.`
                                });

                                // channel - message - success
                                await channel.send({
                                    embeds: [new EmbedBuilder()
                                        .setTitle(`${client.user.username} | Compra Aprovada`)
                                        .addFields(
                                            { name: `🛒 | Produto(s) Comprado(s):`, value: `${allProductsNames.join(`\n`)}` },
                                            { name: `📝 | ID da Compra:`, value: `${dataPaymentId}` },
                                            { name: `⭐ | Obrigado por Comprar Conosco!`, value: `**${guild.name}** Agradece a sua Preferência.` },
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
                                        const productIds = Object.keys(product.data.products)

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
                                                        .setDescription(`⚠ | Parece que alguém já adquiriu o produto: **${purchaseName}** antes de você, ${buyer}. Por favor, abra um ticket para relatar o problema.`)
                                                        .setColor(`Red`)
                                                        .setTimestamp()
                                                    ]
                                                });
                                                return;
                                            };

                                            // saves information in the user profile by dbProfile (wio.db)
                                            await dbProfiles.add(`${buyer.id}.ordersTotal`, 1);
                                            await dbProfiles.add(`${buyer.id}.paidsTotal`, Number(purchasePrice));
                                            await dbProfiles.set(`${buyer.id}.lastPurchase`, moment());

                                            // saves information in the product by dbProducts (wio.db)
                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.incomeTotal`, Number(purchasePrice));
                                            await dbProducts.add(`${pId.replace(`p-`, ``)}.sellsTotal`, Number(purchaseAmount));

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
                                await dbPurchases.set(`${dataPaymentId}.productsDelivered`, itensRemoved);

                                // checks if the number of products is less than or equal to 7
                                if (Number(itensTotal) <= 7) {

                                    // variables with information from the coupon used
                                    const couponValueFormatted = couponValue != `none` ? couponValue : `R$0.00`;
                                    const couponUsedFormatted = couponUsed != `none` ? couponUsed : `Nenhum Cupom.`;

                                    // cart payment date
                                    const paymentDate = `<t:${Math.floor(moment().toDate().getTime() / 1000)}:f> (<t:${Math.floor(moment().toDate().getTime() / 1000)}:R>)`;

                                    // log - cart time expired - channel
                                    const channelLogsPriv = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                    if (channelLogsPriv) {
                                        channelLogsPriv.send({
                                            embeds: [new EmbedBuilder()
                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                .addFields(
                                                    { name: `🔎 | APROVADA POR:`, value: `${buyer} | ${buyer.username}` },
                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${dataPaymentId}\`` },
                                                    { name: `👤 | COMPRADOR(A):`, value: `${buyer} | ${buyer.username}` },
                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${buyer.id}\`` },
                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Aprovação Manual` },
                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`${itensRemoved}\`\`\`` }
                                                )
                                                .setColor(`NotQuiteBlack`)
                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
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
                                    const channelLogsPriv = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPrivId`));
                                    if (channelLogsPriv) {
                                        channelLogsPriv.send({
                                            embeds: [new EmbedBuilder()
                                                .setTitle(`${client.user.username} | Compra Aprovada`)
                                                .addFields(
                                                    { name: `🔎 | APROVADA POR:`, value: `${buyer} | ${buyer.username}` },
                                                    { name: `📝 | ID DO PEDIDO:`, value: `\`${dataPaymentId}\`` },
                                                    { name: `👤 | COMPRADOR(A):`, value: `${buyer} | ${buyer.username}` },
                                                    { name: `🏷 | ID DO COMPRADOR:`, value: `\`${buyer.id}\`` },
                                                    { name: `🌎 | PRODUTO(S) ID(S):`, value: `\`${allProductsIds.join(`, `)}\`` },
                                                    { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                    { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                    { name: `💳 | MÉTODO DE PAGAMENTO:`, value: `Aprovação Manual` },
                                                    { name: `🎁 | CUPOM UTILIZADO:`, value: `${couponUsedFormatted}` },
                                                    { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                    { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                    { name: `📦 | PRODUTO(S) ENTREGUE(S):`, value: `\`\`\`Produtos no TXT.\`\`\`` }
                                                )
                                                .setColor(`NotQuiteBlack`)
                                                .setFooter({ text: `${client.user.username} - Todos os direitos reservados.` })
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
                                const channelLogsPublic = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
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
                                        const filter = (m) => m.buyer.id == buyer.id;
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
                                                        const channelLogsPublic = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                        if (channelLogsPublic) {
                                                            await channelLogsPublic.send({
                                                                content: `${buyer}`,
                                                                embeds: [new EmbedBuilder()
                                                                    .setTitle(`${client.user.username} | Compra Aprovada`)
                                                                    .addFields(
                                                                        { name: `👤 | COMPRADOR(A):`, value: `${buyer} | ${buyer.username}` },
                                                                        { name: `📜 | PRODUTO(S) COMPRADO(S):`, value: `${allProductsNames.join(`\n`)}` },
                                                                        { name: `💸 | VALOR PAGO:`, value: `\`R$${Number(totalPrice).toFixed(2)}\`` },
                                                                        { name: `🎉 | VALOR DO DESCONTO:`, value: `\`${couponValueFormatted}\`` },
                                                                        { name: `⏰ | DATA & HORÁRIO:`, value: `${paymentDate}` },
                                                                        { name: `⭐ | AVALIAÇÃO:`, value: `${`⭐`.repeat(rateNumber)} (${rateNumber})\n**__${buyer.username}__**: ${inserterRateText}` }
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
                                                const channelLogsPublic = guild.channels.cache.get(dbConfigs.get(`channels.channelLogsPublicId`));
                                                if (channelLogsPublic) {
                                                    await channelLogsPublic.send({
                                                        content: `${buyer}`,
                                                        embeds: [new EmbedBuilder()
                                                            .setTitle(`${client.user.username} | Compra Aprovada`)
                                                            .addFields(
                                                                { name: `👤 | COMPRADOR(A):`, value: `${buyer} | ${buyer.username}` },
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
                                const channelMsg = await guild.channels.cache.get(channelId);

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

                } catch (err) {
                    console.error(err);
                };

            };

        };

    },
};