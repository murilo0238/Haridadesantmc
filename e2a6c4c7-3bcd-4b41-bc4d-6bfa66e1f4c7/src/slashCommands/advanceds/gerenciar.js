// discord.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, ActivityType, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType } = require("discord.js");

// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// axios - request
const axios = require("axios");

// url
const url = require("node:url");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbConfigs = new JsonDatabase({ databasePath: "./databases/dbConfigs.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("gerenciar")
        .setDescription("[🛠/OWNER] Gerencie as configurações do BOT!")
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

        // new sales status via dbConfigs (wio.db)
        const statusNewSales = await dbConfigs.get(`newSales`);

        // row config - button (1)
        const rowConfig1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`configPayments`).setLabel(`Configurar Pagamentos`).setEmoji(`💳`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`configBot`).setLabel(`Configurar BOT`).setEmoji(`🌎`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`configChannels`).setLabel(`Configurar Canais`).setEmoji(`⚙`).setStyle(`Primary`),
            );

        // row config - button (2)
        const rowConfig2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`changeTerms`).setLabel(`Alterar os Termos de Compra`).setEmoji(`📜`).setStyle(`Primary`),
                new ButtonBuilder().setCustomId(`toggleNewSales`).setLabel(`Sistema de Vendas [ON/OFF]`).setEmoji(`🌎`).setStyle(statusNewSales ? `Success` : `Danger`),
                new ButtonBuilder().setCustomId(`addBotLink`).setLabel(`Link do BOT`).setEmoji(`🤖`).setStyle(`Secondary`)
            );

        // embed config
        const embedConfig = new EmbedBuilder()
            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
            .setTitle(`${client.user.username} | Configurações`)
            .setDescription(`**🌎 | Sistema de Vendas: ${statusNewSales ? `\`ON\`` : `\`OFF\``}**`)
            .setColor(`NotQuiteBlack`)
            .setFooter({ text: `Configure usando as opções e botões abaixo.` });

        // message - send
        await interaction.reply({
            embeds: [embedConfig],
            components: [rowConfig1, rowConfig2]
        }).then(async (msg) => {

            // createMessageComponentCollector - collector
            const collectorFilter = (i) => i.user.id == interaction.user.id;
            const collectorConfig = msg.createMessageComponentCollector({
                filter: collectorFilter,
                time: 600000
            });
            collectorConfig.on("collect", async (iManage) => {

                // configPayments - option
                if (iManage.customId == `configPayments`) {

                    // deferUpdate - postphone the update
                    await iManage.deferUpdate();

                    // row payments - methods - button
                    const rowPaymentsMethods = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`mpMethod`).setLabel(`Mercado Pago`).setEmoji(`💠`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`balanceMethod`).setLabel(`Saldo`).setEmoji(`💰`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`semiAutoMethod`).setLabel(`Semi-Auto`).setEmoji(`💸`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`previousPaymentMethods`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                        );

                    // embed payments - methots
                    const embedPaymentsMethods = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`${client.user.username} | Configurações`)
                        .setDescription(`**💳 | Selecione o sistema de pagamento que você deseja configurar.**`)
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `Configure usando os botões abaixo.` });

                    // message - edit
                    await msg.edit({
                        embeds: [embedPaymentsMethods],
                        components: [rowPaymentsMethods]
                    }).then(async (msgPaymentsMethods) => {

                        // createMessageComponentCollector - collector
                        const collectorFilter = (i) => i.user.id == interaction.user.id;
                        const collectorPaymentMethods = msgPaymentsMethods.createMessageComponentCollector({
                            filter: collectorFilter,
                            time: 600000
                        });
                        collectorPaymentMethods.on("collect", async (iPaymentMethods) => {

                            // mpMethod - button
                            if (iPaymentMethods.customId == `mpMethod`) {

                                // deferUpdate - postphone the update
                                await iPaymentMethods.deferUpdate();

                                // variables with status of each payment method
                                const pixPayment = await dbConfigs.get(`payments.paymentsOptions.pix`);
                                const sitePayment = await dbConfigs.get(`payments.paymentsOptions.site`);
                                const accessTokenPayment = await dbConfigs.get(`payments.mpAcessToken`);

                                // row payments - mp - button
                                const rowPaymentsMP = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`togglePix`).setLabel(`Pix [ON/OFF]`).setEmoji(`🔧`).setStyle(pixPayment ? `Success` : `Danger`),
                                        new ButtonBuilder().setCustomId(`toggleSite`).setLabel(`Site [ON/OFF]`).setEmoji(`🔧`).setStyle(sitePayment ? `Success` : `Danger`),
                                        new ButtonBuilder().setCustomId(`changeAccessToken`).setLabel(`Alterar Access Token`).setEmoji(`⚙`).setStyle(`Primary`),
                                        new ButtonBuilder().setCustomId(`previousPaymentMP`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                    );

                                // embed payments - mp
                                const embedPaymentsMP = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Mercado Pago`)
                                    .setDescription(`**💠 | Pix: ${pixPayment ? `\`ON\`` : `\`OFF\``}\n🔗 | Pagar pelo Site: ${sitePayment ? `\`ON\`` : `\`OFF\``}\n⚙ | Access Token: ${accessTokenPayment != `none` ? `||${accessTokenPayment}||` : `||Não configurado.||`}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedPaymentsMP],
                                    components: [rowPaymentsMP]
                                }).then(async (msgPaymentsMP) => {

                                    // createMessageComponentCollector - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const collectorPaymentMP = msgPaymentsMP.createMessageComponentCollector({
                                        filter: collectorFilter,
                                        time: 600000
                                    });
                                    collectorPaymentMP.on("collect", async (iPaymentsMP) => {

                                        // togglePix - button
                                        if (iPaymentsMP.customId == `togglePix`) {

                                            // deferUpdate - postphone the update
                                            await iPaymentsMP.deferUpdate();

                                            // checks if the status is true
                                            const pixPayment = await dbConfigs.get(`payments.paymentsOptions.pix`);
                                            if (pixPayment) {

                                                // set the information status to false via dbConfigs (wio.db)
                                                await dbConfigs.set(`payments.paymentsOptions.pix`, false);

                                                // variables with status of each payment method
                                                const pixPayment = await dbConfigs.get(`payments.paymentsOptions.pix`);
                                                const sitePayment = await dbConfigs.get(`payments.paymentsOptions.site`);
                                                const accessTokenPayment = await dbConfigs.get(`payments.mpAcessToken`);

                                                // row payments - mp - button
                                                const rowPaymentsMP = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`togglePix`).setLabel(`Pix [ON/OFF]`).setEmoji(`🔧`).setStyle(pixPayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`toggleSite`).setLabel(`Site [ON/OFF]`).setEmoji(`🔧`).setStyle(sitePayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`changeAccessToken`).setLabel(`Alterar Access Token`).setEmoji(`⚙`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPaymentMP`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                    );

                                                // embed payments - mp
                                                const embedPaymentsMP = new EmbedBuilder()
                                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                    .setTitle(`${client.user.username} | Mercado Pago`)
                                                    .setDescription(`**💠 | Pix: ${pixPayment ? `\`ON\`` : `\`OFF\``}\n🔗 | Pagar pelo Site: ${sitePayment ? `\`ON\`` : `\`OFF\``}\n⚙ | Access Token: ${accessTokenPayment != `none` ? `||${accessTokenPayment}||` : `||Não configurado.||`}**`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                                // message - edit
                                                await msg.edit({
                                                    embeds: [embedPaymentsMP],
                                                    components: [rowPaymentsMP]
                                                });

                                            } else {

                                                // set the information status to false via dbConfigs (wio.db)
                                                await dbConfigs.set(`payments.paymentsOptions.pix`, true);

                                                // variables with status of each payment method
                                                const pixPayment = await dbConfigs.get(`payments.paymentsOptions.pix`);
                                                const sitePayment = await dbConfigs.get(`payments.paymentsOptions.site`);
                                                const accessTokenPayment = await dbConfigs.get(`payments.mpAcessToken`);

                                                // row payments - mp - button
                                                const rowPaymentsMP = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`togglePix`).setLabel(`Pix [ON/OFF]`).setEmoji(`🔧`).setStyle(pixPayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`toggleSite`).setLabel(`Site [ON/OFF]`).setEmoji(`🔧`).setStyle(sitePayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`changeAccessToken`).setLabel(`Alterar Access Token`).setEmoji(`⚙`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPaymentMP`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                    );

                                                // embed payments - mp
                                                const embedPaymentsMP = new EmbedBuilder()
                                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                    .setTitle(`${client.user.username} | Mercado Pago`)
                                                    .setDescription(`**💠 | Pix: ${pixPayment ? `\`ON\`` : `\`OFF\``}\n🔗 | Pagar pelo Site: ${sitePayment ? `\`ON\`` : `\`OFF\``}\n⚙ | Access Token: ${accessTokenPayment != `none` ? `||${accessTokenPayment}||` : `||Não configurado.||`}**`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                                // message - edit
                                                await msg.edit({
                                                    embeds: [embedPaymentsMP],
                                                    components: [rowPaymentsMP]
                                                });

                                            };

                                        };

                                        // toggleSite - button
                                        if (iPaymentsMP.customId == `toggleSite`) {

                                            // deferUpdate - postphone the update
                                            await iPaymentsMP.deferUpdate();

                                            // checks if the status is true
                                            const sitePayment = await dbConfigs.get(`payments.paymentsOptions.site`);
                                            if (sitePayment) {

                                                // set the information status to false via dbConfigs (wio.db)
                                                await dbConfigs.set(`payments.paymentsOptions.site`, false);

                                                // variables with status of each payment method
                                                const pixPayment = await dbConfigs.get(`payments.paymentsOptions.pix`);
                                                const sitePayment = await dbConfigs.get(`payments.paymentsOptions.site`);
                                                const accessTokenPayment = await dbConfigs.get(`payments.mpAcessToken`);

                                                // row payments - mp - button
                                                const rowPaymentsMP = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`togglePix`).setLabel(`Pix [ON/OFF]`).setEmoji(`🔧`).setStyle(pixPayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`toggleSite`).setLabel(`Site [ON/OFF]`).setEmoji(`🔧`).setStyle(sitePayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`changeAccessToken`).setLabel(`Alterar Access Token`).setEmoji(`⚙`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPaymentMP`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                    );

                                                // embed payments - mp
                                                const embedPaymentsMP = new EmbedBuilder()
                                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                    .setTitle(`${client.user.username} | Mercado Pago`)
                                                    .setDescription(`**💠 | Pix: ${pixPayment ? `\`ON\`` : `\`OFF\``}\n🔗 | Pagar pelo Site: ${sitePayment ? `\`ON\`` : `\`OFF\``}\n⚙ | Access Token: ${accessTokenPayment != `none` ? `||${accessTokenPayment}||` : `||Não configurado.||`}**`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                                // message - edit
                                                await msg.edit({
                                                    embeds: [embedPaymentsMP],
                                                    components: [rowPaymentsMP]
                                                });

                                            } else {

                                                // set the information status to false via dbConfigs (wio.db)
                                                await dbConfigs.set(`payments.paymentsOptions.site`, true);

                                                // variables with status of each payment method
                                                const pixPayment = await dbConfigs.get(`payments.paymentsOptions.pix`);
                                                const sitePayment = await dbConfigs.get(`payments.paymentsOptions.site`);
                                                const accessTokenPayment = await dbConfigs.get(`payments.mpAcessToken`);

                                                // row payments - mp - button
                                                const rowPaymentsMP = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`togglePix`).setLabel(`Pix [ON/OFF]`).setEmoji(`🔧`).setStyle(pixPayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`toggleSite`).setLabel(`Site [ON/OFF]`).setEmoji(`🔧`).setStyle(sitePayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`changeAccessToken`).setLabel(`Alterar Access Token`).setEmoji(`⚙`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPaymentMP`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                    );

                                                // embed payments - mp
                                                const embedPaymentsMP = new EmbedBuilder()
                                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                    .setTitle(`${client.user.username} | Mercado Pago`)
                                                    .setDescription(`**💠 | Pix: ${pixPayment ? `\`ON\`` : `\`OFF\``}\n🔗 | Pagar pelo Site: ${sitePayment ? `\`ON\`` : `\`OFF\``}\n⚙ | Access Token: ${accessTokenPayment != `none` ? `||${accessTokenPayment}||` : `||Não configurado.||`}**`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                                // message - edit
                                                await msg.edit({
                                                    embeds: [embedPaymentsMP],
                                                    components: [rowPaymentsMP]
                                                });

                                            };

                                        };

                                        // changeAccessToken - button
                                        if (iPaymentsMP.customId == `changeAccessToken`) {

                                            // create the modal
                                            const modal = new ModalBuilder()
                                                .setCustomId(`modalAccessToken`)
                                                .setTitle(`⚙ | Access Token`);

                                            // creates the components for the modal
                                            const inputAccessToken = new TextInputBuilder()
                                                .setCustomId('accessTokenText')
                                                .setLabel(`Access Token: (MP)`)
                                                .setMaxLength(300)
                                                .setPlaceholder(`Insira seu access token ...`)
                                                .setRequired(true)
                                                .setStyle(`Paragraph`);

                                            // rows for components
                                            const iAccessToken = new ActionRowBuilder()
                                                .addComponents(inputAccessToken);

                                            // add the rows to the modal
                                            await modal.addComponents(iAccessToken);

                                            // open the modal
                                            await iPaymentsMP.showModal(modal);

                                            // event - once - interactionCreate
                                            client.once("interactionCreate", async (iModal) => {

                                                // modalAccessToken - modal
                                                if (iModal.customId == `modalAccessToken`) {

                                                    // deferUpdate - postphone the update
                                                    await iModal.deferUpdate();

                                                    // access token inserted
                                                    const accessTokenInserted = iModal.fields.getTextInputValue(`accessTokenText`);

                                                    // checks if the token is valid per request (axios)
                                                    await axios.get(`https://api.mercadopago.com/v1/payments/search`, {
                                                        headers: {
                                                            "Authorization": `Bearer ${accessTokenInserted}`
                                                        }
                                                    }).then(async (response) => {

                                                        // set the access token in dbConfigs (wio.db)
                                                        await dbConfigs.set(`payments.mpAcessToken`, accessTokenInserted);

                                                        // variables with status of each payment method
                                                        const pixPayment = await dbConfigs.get(`payments.paymentsOptions.pix`);
                                                        const sitePayment = await dbConfigs.get(`payments.paymentsOptions.site`);
                                                        const accessTokenPayment = await dbConfigs.get(`payments.mpAcessToken`);

                                                        // row payments - mp - button
                                                        const rowPaymentsMP = new ActionRowBuilder()
                                                            .addComponents(
                                                                new ButtonBuilder().setCustomId(`togglePix`).setLabel(`Pix [ON/OFF]`).setEmoji(`🔧`).setStyle(pixPayment ? `Success` : `Danger`),
                                                                new ButtonBuilder().setCustomId(`toggleSite`).setLabel(`Site [ON/OFF]`).setEmoji(`🔧`).setStyle(sitePayment ? `Success` : `Danger`),
                                                                new ButtonBuilder().setCustomId(`changeAccessToken`).setLabel(`Alterar Access Token`).setEmoji(`⚙`).setStyle(`Primary`),
                                                                new ButtonBuilder().setCustomId(`previousPaymentMP`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                            );

                                                        // embed payments - mp
                                                        const embedPaymentsMP = new EmbedBuilder()
                                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                            .setTitle(`${client.user.username} | Mercado Pago`)
                                                            .setDescription(`**💠 | Pix: ${pixPayment ? `\`ON\`` : `\`OFF\``}\n🔗 | Pagar pelo Site: ${sitePayment ? `\`ON\`` : `\`OFF\``}\n⚙ | Access Token: ${accessTokenPayment != `none` ? `||${accessTokenPayment}||` : `||Não configurado.||`}**`)
                                                            .setColor(`NotQuiteBlack`)
                                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                                        // message - edit
                                                        await msg.edit({
                                                            embeds: [embedPaymentsMP],
                                                            components: [rowPaymentsMP]
                                                        });

                                                        // message - success
                                                        await iModal.followUp({
                                                            content: `✅ | Access token alterado com sucesso.`,
                                                            ephemeral: true
                                                        });

                                                    }).catch(async (err) => {

                                                        // message - error
                                                        await iModal.followUp({
                                                            content: `❌ | Access token invalido.`,
                                                            ephemeral: true
                                                        });

                                                    });

                                                };

                                            });

                                        };

                                        // previousPaymentMP - button
                                        if (iPaymentsMP.customId == `previousPaymentMP`) {

                                            // deferUpdate - postphone the update
                                            await iPaymentsMP.deferUpdate();

                                            // message - edit
                                            await msgPaymentsMP.edit({
                                                embeds: [embedPaymentsMethods],
                                                components: [rowPaymentsMethods]
                                            });

                                            // stop the collector (collectorPaymentMP)
                                            await collectorPaymentMP.stop();

                                        };

                                    });

                                });

                            };

                            // balanceMethod - button
                            if (iPaymentMethods.customId == `balanceMethod`) {

                                // deferUpdate - postphone the update
                                await iPaymentMethods.deferUpdate();

                                // variables with informations of each payment method
                                const balancePayment = await dbConfigs.get(`payments.paymentsOptions.balance`);
                                const balanceBonusDeposit = await dbConfigs.get(`balance.bonusDeposit`) || 0;
                                const balanceMinimumDeposit = await dbConfigs.get(`balance.minimumDeposit`) || 0;

                                // row payments - balance - button
                                const rowPaymentsBalance = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`toggleBalance`).setLabel(`Saldo [ON/OFF]`).setEmoji(`💰`).setStyle(balancePayment ? `Success` : `Danger`),
                                        new ButtonBuilder().setCustomId(`depositBonus`).setLabel(`Bônus por Depósito`).setEmoji(`🎁`).setStyle(`Primary`),
                                        new ButtonBuilder().setCustomId(`minimumDeposit`).setLabel(`Valor Mínimo de Depósito`).setEmoji(`💸`).setStyle(`Primary`),
                                        new ButtonBuilder().setCustomId(`previousPaymentBalance`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                    );

                                // embed payments - balance
                                const embedPaymentsBalance = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Saldo`)
                                    .setDescription(`**💰 | Saldo: ${balancePayment ? `\`ON\`` : `\`OFF\``}\n🎁 | Bônus por Depósito: \`${Number(balanceBonusDeposit)}%\`\n💸 | Valor Mínimo de Depósito: \`R$${Number(balanceMinimumDeposit).toFixed(2)}\`**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedPaymentsBalance],
                                    components: [rowPaymentsBalance]
                                }).then(async (msgPaymentsBalance) => {

                                    // createMessageComponentCollector - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const collectorPaymentBalance = msgPaymentsBalance.createMessageComponentCollector({
                                        filter: collectorFilter,
                                        time: 600000
                                    });
                                    collectorPaymentBalance.on("collect", async (iPaymentsBalance) => {

                                        // toggleBalance - buttom
                                        if (iPaymentsBalance.customId == `toggleBalance`) {

                                            // deferUpdate - postphone the update
                                            await iPaymentsBalance.deferUpdate();

                                            // checks if the status is true
                                            const balancePayment = await dbConfigs.get(`payments.paymentsOptions.balance`);
                                            if (balancePayment) {

                                                // set the information status to false via dbConfigs (wio.db)
                                                await dbConfigs.set(`payments.paymentsOptions.balance`, false);

                                                // variables with informations of each ppayment method
                                                const balancePayment = await dbConfigs.get(`payments.paymentsOptions.balance`);
                                                const balanceBonusDeposit = await dbConfigs.get(`balance.bonusDeposit`) || 0;
                                                const balanceMinimumDeposit = await dbConfigs.get(`balance.minimumDeposit`) || 0;

                                                // row payments - balance - button
                                                const rowPaymentsBalance = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`toggleBalance`).setLabel(`Saldo [ON/OFF]`).setEmoji(`💰`).setStyle(balancePayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`depositBonus`).setLabel(`Bônus por Depósito`).setEmoji(`🎁`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`minimumDeposit`).setLabel(`Valor Mínimo de Depósito`).setEmoji(`💸`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPaymentBalance`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                    );

                                                // embed payments - balance
                                                const embedPaymentsBalance = new EmbedBuilder()
                                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                    .setTitle(`${client.user.username} | Saldo`)
                                                    .setDescription(`**💰 | Saldo: ${balancePayment ? `\`ON\`` : `\`OFF\``}\n🎁 | Bônus por Depósito: \`${Number(balanceBonusDeposit)}%\`\n💸 | Valor Mínimo de Depósito: \`R$${Number(balanceMinimumDeposit).toFixed(2)}\`**`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                                // message - edit
                                                await msg.edit({
                                                    embeds: [embedPaymentsBalance],
                                                    components: [rowPaymentsBalance]
                                                });

                                            } else {

                                                // set the information status to true via dbConfigs (wio.db)
                                                await dbConfigs.set(`payments.paymentsOptions.balance`, true);

                                                // variables with informations of each ppayment method
                                                const balancePayment = await dbConfigs.get(`payments.paymentsOptions.balance`);
                                                const balanceBonusDeposit = await dbConfigs.get(`balance.bonusDeposit`) || 0;
                                                const balanceMinimumDeposit = await dbConfigs.get(`balance.minimumDeposit`) || 0;

                                                // row payments - balance - button
                                                const rowPaymentsBalance = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`toggleBalance`).setLabel(`Saldo [ON/OFF]`).setEmoji(`💰`).setStyle(balancePayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`depositBonus`).setLabel(`Bônus por Depósito`).setEmoji(`🎁`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`minimumDeposit`).setLabel(`Valor Mínimo de Depósito`).setEmoji(`💸`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPaymentBalance`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                    );

                                                // embed payments - balance
                                                const embedPaymentsBalance = new EmbedBuilder()
                                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                    .setTitle(`${client.user.username} | Saldo`)
                                                    .setDescription(`**💰 | Saldo: ${balancePayment ? `\`ON\`` : `\`OFF\``}\n🎁 | Bônus por Depósito: \`${Number(balanceBonusDeposit)}%\`\n💸 | Valor Mínimo de Depósito: \`R$${Number(balanceMinimumDeposit).toFixed(2)}\`**`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                                // message - edit
                                                await msg.edit({
                                                    embeds: [embedPaymentsBalance],
                                                    components: [rowPaymentsBalance]
                                                });

                                            };

                                        };

                                        // depositBonus - button
                                        if (iPaymentsBalance.customId == `depositBonus`) {

                                            // create the modal
                                            const modal = new ModalBuilder()
                                                .setCustomId(`modalBonusDeposit`)
                                                .setTitle(`🎁 | Bônus por Depósito`);

                                            // creates the components for the modal
                                            const inputBonusDeposit = new TextInputBuilder()
                                                .setCustomId('bonusDepositNum')
                                                .setLabel(`Bônus por Depósito:`)
                                                .setMaxLength(3)
                                                .setPlaceholder(`Exemplo: 25`)
                                                .setRequired(true)
                                                .setStyle(`Paragraph`);

                                            // rows for components
                                            const iBonusDeposit = new ActionRowBuilder()
                                                .addComponents(inputBonusDeposit);

                                            // add the rows to the modal
                                            await modal.addComponents(iBonusDeposit);

                                            // open the modal
                                            await iPaymentsBalance.showModal(modal);

                                            // event - once - interactionCreate
                                            client.once("interactionCreate", async (iModal) => {

                                                // modalBonusDeposit - modal
                                                if (iModal.customId == `modalBonusDeposit`) {

                                                    // deferUpdate - postphone the update
                                                    await iModal.deferUpdate();

                                                    // bonus inserted
                                                    const bonusInserted = iModal.fields.getTextInputValue(`bonusDepositNum`);

                                                    // checks whether the amount entered is a valid number
                                                    if (isNaN(bonusInserted)) {
                                                        await iModal.followUp({
                                                            content: `❌ | O bônus inserido não é um número válido.`,
                                                            ephemeral: true
                                                        });
                                                        return;

                                                    } else {

                                                        // checks if the amount is greater than 100
                                                        if (bonusInserted > 100) {
                                                            await iModal.followUp({
                                                                content: `⚠ | O bônus deve ser menor ou igual a **100**.`,
                                                                ephemeral: true
                                                            });
                                                            return;
                                                        };

                                                    };

                                                    // set the information in dbConfigs (wio.db)+
                                                    await dbConfigs.set(`balance.bonusDeposit`, Number(bonusInserted));

                                                    // variables with informations of each ppayment method
                                                    const balancePayment = await dbConfigs.get(`payments.paymentsOptions.balance`);
                                                    const balanceBonusDeposit = await dbConfigs.get(`balance.bonusDeposit`) || 0;
                                                    const balanceMinimumDeposit = await dbConfigs.get(`balance.minimumDeposit`) || 0;

                                                    // row payments - balance - button
                                                    const rowPaymentsBalance = new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`toggleBalance`).setLabel(`Saldo [ON/OFF]`).setEmoji(`💰`).setStyle(balancePayment ? `Success` : `Danger`),
                                                            new ButtonBuilder().setCustomId(`depositBonus`).setLabel(`Bônus por Depósito`).setEmoji(`🎁`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`minimumDeposit`).setLabel(`Valor Mínimo de Depósito`).setEmoji(`💸`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`previousPaymentBalance`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                        );

                                                    // embed payments - balance
                                                    const embedPaymentsBalance = new EmbedBuilder()
                                                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                        .setTitle(`${client.user.username} | Saldo`)
                                                        .setDescription(`**💰 | Saldo: ${balancePayment ? `\`ON\`` : `\`OFF\``}\n🎁 | Bônus por Depósito: \`${Number(balanceBonusDeposit)}%\`\n💸 | Valor Mínimo de Depósito: \`R$${Number(balanceMinimumDeposit).toFixed(2)}\`**`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Configure usando os botões abaixo.` });

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedPaymentsBalance],
                                                        components: [rowPaymentsBalance]
                                                    });

                                                };

                                            });

                                        };

                                        // minimumDeposit - button
                                        if (iPaymentsBalance.customId == `minimumDeposit`) {

                                            // create the modal
                                            const modal = new ModalBuilder()
                                                .setCustomId(`modalMinimumDeposit`)
                                                .setTitle(`💸 | Valor Mínimo de Depósito`);

                                            // creates the components for the modal
                                            const inputMinimumDeposit = new TextInputBuilder()
                                                .setCustomId('minimumDepositNum')
                                                .setLabel(`Valor Mínimo de Depósito:`)
                                                .setMaxLength(6)
                                                .setPlaceholder(`Exemplo: 50.00`)
                                                .setRequired(true)
                                                .setStyle(`Paragraph`);

                                            // rows for components
                                            const iMinimumDeposit = new ActionRowBuilder()
                                                .addComponents(inputMinimumDeposit);

                                            // add the rows to the modal
                                            await modal.addComponents(iMinimumDeposit);

                                            // open the modal
                                            await iPaymentsBalance.showModal(modal);

                                            // event - once - interactionCreate
                                            client.once("interactionCreate", async (iModal) => {

                                                // modalMinimumDeposit - modal
                                                if (iModal.customId == `modalMinimumDeposit`) {

                                                    // deferUpdate - postphone the update
                                                    await iModal.deferUpdate();

                                                    // value inserted
                                                    const valueInserted = iModal.fields.getTextInputValue(`minimumDepositNum`)
                                                        .trim()
                                                        .replace(`R$`, ``);

                                                    // invalid value
                                                    const valueRegex = /^\d+(\.\d{1,2})?$/;
                                                    if (!valueRegex.test(valueInserted)) {
                                                        await iModal.followUp({
                                                            content: `❌ | O valor inserido é inválido.`,
                                                            ephemeral: true
                                                        });
                                                        return;
                                                    };

                                                    // set the information in dbConfigs (wio.db)+
                                                    await dbConfigs.set(`balance.minimumDeposit`, Number(valueInserted));

                                                    // variables with informations of each ppayment method
                                                    const balancePayment = await dbConfigs.get(`payments.paymentsOptions.balance`);
                                                    const balanceBonusDeposit = await dbConfigs.get(`balance.bonusDeposit`) || 0;
                                                    const balanceMinimumDeposit = await dbConfigs.get(`balance.minimumDeposit`) || 0;

                                                    // row payments - balance - button
                                                    const rowPaymentsBalance = new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`toggleBalance`).setLabel(`Saldo [ON/OFF]`).setEmoji(`💰`).setStyle(balancePayment ? `Success` : `Danger`),
                                                            new ButtonBuilder().setCustomId(`depositBonus`).setLabel(`Bônus por Depósito`).setEmoji(`🎁`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`minimumDeposit`).setLabel(`Valor Mínimo de Depósito`).setEmoji(`💸`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`previousPaymentBalance`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                        );

                                                    // embed payments - balance
                                                    const embedPaymentsBalance = new EmbedBuilder()
                                                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                        .setTitle(`${client.user.username} | Saldo`)
                                                        .setDescription(`**💰 | Saldo: ${balancePayment ? `\`ON\`` : `\`OFF\``}\n🎁 | Bônus por Depósito: \`${Number(balanceBonusDeposit)}%\`\n💸 | Valor Mínimo de Depósito: \`R$${Number(balanceMinimumDeposit).toFixed(2)}\`**`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Configure usando os botões abaixo.` });

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedPaymentsBalance],
                                                        components: [rowPaymentsBalance]
                                                    });

                                                };

                                            });

                                        };

                                        // previousPaymentBalance - button
                                        if (iPaymentsBalance.customId == `previousPaymentBalance`) {

                                            // deferUpdate - postphone the update
                                            await iPaymentsBalance.deferUpdate();

                                            // message - edit
                                            await msgPaymentsBalance.edit({
                                                embeds: [embedPaymentsMethods],
                                                components: [rowPaymentsMethods]
                                            });

                                            // stop the collector (collectorPaymentBalance)
                                            await collectorPaymentBalance.stop();

                                        };

                                    });

                                });

                            };

                            // semiAutoMethod - button
                            if (iPaymentMethods.customId == `semiAutoMethod`) {

                                // deferUpdate - postphone the update
                                await iPaymentMethods.deferUpdate();

                                // variables with informations of each payment method
                                const semiAutoPayment = await dbConfigs.get(`payments.paymentsOptions.semiAuto`);

                                // variables with informations of semi-auto
                                const semiAutoPix = await dbConfigs.get(`semiAuto.pix.key`);
                                const semiAutoPixType = await dbConfigs.get(`semiAuto.pix.keyType`);
                                const semiAutoQRCode = await dbConfigs.get(`semiAuto.qrCode`);

                                // row payments - semiauto - button
                                const rowPaymentsSemiAuto = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`toggleSemiAuto`).setLabel(`Semi-Auto [ON/OFF]`).setEmoji(`🔧`).setStyle(semiAutoPayment ? `Success` : `Danger`),
                                        new ButtonBuilder().setCustomId(`changePix`).setLabel(`Pix`).setEmoji(`💠`).setStyle(`Primary`),
                                        new ButtonBuilder().setCustomId(`changeQrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                                        new ButtonBuilder().setCustomId(`previousPaymentSemiAuto`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                    );

                                // embed payments - semiauto
                                const embedPaymentsSemiAuto = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Semi-Auto`)
                                    .setDescription(`**⚙ | Vendas Semi-Auto: ${semiAutoPayment ? `\`ON\`` : `\`OFF\``}\n💠 | Chave PIX: ${semiAutoPix != `none` ? `\`${semiAutoPix} | ${semiAutoPixType}\`` : `\`Não configurado.\``}\n🖼 | QR Code: ${semiAutoQRCode != `none` ? `[Link do QR Code](${semiAutoQRCode})` : `\`Não configurado.\``}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                // message - edit
                                await msg.edit({
                                    embeds: [embedPaymentsSemiAuto],
                                    components: [rowPaymentsSemiAuto]
                                }).then(async (msgPaymentsSemiAuto) => {

                                    // createMessageComponentCollector - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const collectorPaymentSemiAuto = msgPaymentsSemiAuto.createMessageComponentCollector({
                                        filter: collectorFilter,
                                        time: 600000
                                    });
                                    collectorPaymentSemiAuto.on("collect", async (iPaymentsSemiAuto) => {

                                        // toggleSemiAuto - button
                                        if (iPaymentsSemiAuto.customId == `toggleSemiAuto`) {

                                            // deferUpdate - postphone the update
                                            await iPaymentsSemiAuto.deferUpdate();

                                            // checks if the status is true
                                            const semiAutoPayment = await dbConfigs.get(`payments.paymentsOptions.semiAuto`);
                                            if (semiAutoPayment) {

                                                // set the information status to false via dbConfigs (wio.db)
                                                await dbConfigs.set(`payments.paymentsOptions.semiAuto`, false);

                                                // variables with informations of each payment method
                                                const semiAutoPayment = await dbConfigs.get(`payments.paymentsOptions.semiAuto`);

                                                // variables with informations of semi-auto
                                                const semiAutoPix = await dbConfigs.get(`semiAuto.pix.key`);
                                                const semiAutoPixType = await dbConfigs.get(`semiAuto.pix.keyType`);
                                                const semiAutoQRCode = await dbConfigs.get(`semiAuto.qrCode`);

                                                // row payments - semiauto - button
                                                const rowPaymentsSemiAuto = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`toggleSemiAuto`).setLabel(`Semi-Auto [ON/OFF]`).setEmoji(`🔧`).setStyle(semiAutoPayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`changePix`).setLabel(`Pix`).setEmoji(`💠`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`changeQrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPaymentSemiAuto`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                    );

                                                // embed payments - semiauto
                                                const embedPaymentsSemiAuto = new EmbedBuilder()
                                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                    .setTitle(`${client.user.username} | Semi-Auto`)
                                                    .setDescription(`**⚙ | Vendas Semi-Auto: ${semiAutoPayment ? `\`ON\`` : `\`OFF\``}\n💠 | Chave PIX: ${semiAutoPix != `none` ? `\`${semiAutoPix} | ${semiAutoPixType}\`` : `\`Não configurado.\``}\n🖼 | QR Code: ${semiAutoQRCode != `none` ? `[Link do QR Code](${semiAutoQRCode})` : `\`Não configurado.\``}**`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                                // message - edit
                                                await msg.edit({
                                                    embeds: [embedPaymentsSemiAuto],
                                                    components: [rowPaymentsSemiAuto]
                                                });

                                            } else {

                                                // set the information status to true via dbConfigs (wio.db)
                                                await dbConfigs.set(`payments.paymentsOptions.semiAuto`, true);

                                                // variables with informations of each payment method
                                                const semiAutoPayment = await dbConfigs.get(`payments.paymentsOptions.semiAuto`);

                                                // variables with informations of semi-auto
                                                const semiAutoPix = await dbConfigs.get(`semiAuto.pix.key`);
                                                const semiAutoPixType = await dbConfigs.get(`semiAuto.pix.keyType`);
                                                const semiAutoQRCode = await dbConfigs.get(`semiAuto.qrCode`);

                                                // row payments - semiauto - button
                                                const rowPaymentsSemiAuto = new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`toggleSemiAuto`).setLabel(`Semi-Auto [ON/OFF]`).setEmoji(`🔧`).setStyle(semiAutoPayment ? `Success` : `Danger`),
                                                        new ButtonBuilder().setCustomId(`changePix`).setLabel(`Pix`).setEmoji(`💠`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`changeQrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                                                        new ButtonBuilder().setCustomId(`previousPaymentSemiAuto`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                    );

                                                // embed payments - semiauto
                                                const embedPaymentsSemiAuto = new EmbedBuilder()
                                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                    .setTitle(`${client.user.username} | Semi-Auto`)
                                                    .setDescription(`**⚙ | Vendas Semi-Auto: ${semiAutoPayment ? `\`ON\`` : `\`OFF\``}\n💠 | Chave PIX: ${semiAutoPix != `none` ? `\`${semiAutoPix} | ${semiAutoPixType}\`` : `\`Não configurado.\``}\n🖼 | QR Code: ${semiAutoQRCode != `none` ? `[Link do QR Code](${semiAutoQRCode})` : `\`Não configurado.\``}**`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                                // message - edit
                                                await msg.edit({
                                                    embeds: [embedPaymentsSemiAuto],
                                                    components: [rowPaymentsSemiAuto]
                                                });

                                            };

                                        };

                                        // changePix - button
                                        if (iPaymentsSemiAuto.customId == `changePix`) {

                                            // create the modal
                                            const modal = new ModalBuilder()
                                                .setCustomId(`modalPix`)
                                                .setTitle(`🔑 | Chave PIX`);

                                            // creates the components for the modal (1)
                                            const inputPixKey = new TextInputBuilder()
                                                .setCustomId('pixKeyText')
                                                .setLabel(`Chave PIX:`)
                                                .setMaxLength(50)
                                                .setPlaceholder(`EX: Syntaxleaks@gmail.com`)
                                                .setRequired(true)
                                                .setStyle(`Paragraph`);

                                            // creates the components for the modal (2)
                                            const inputPixKeyType = new TextInputBuilder()
                                                .setCustomId('pixKeyTypeText')
                                                .setLabel(`Tipo de Chave PIX:`)
                                                .setMaxLength(15)
                                                .setPlaceholder(`EX: Email, Telefone, CPF, Aleatória ...`)
                                                .setRequired(true)
                                                .setStyle(`Short`);

                                            // rows for components (1)
                                            const iPixKey = new ActionRowBuilder()
                                                .addComponents(inputPixKey);

                                            // rows for components (2)
                                            const iPixKeyType = new ActionRowBuilder()
                                                .addComponents(inputPixKeyType);

                                            // add the rows to the modal
                                            await modal.addComponents(iPixKey, iPixKeyType);

                                            // open the modal
                                            await iPaymentsSemiAuto.showModal(modal);

                                            // event - once - interactionCreate
                                            client.once("interactionCreate", async (iModal) => {

                                                // modalPix - modal
                                                if (iModal.customId == `modalPix`) {

                                                    // deferUpdate - postphone the update
                                                    await iModal.deferUpdate();

                                                    // informations inserteds
                                                    const pixKeyInserted = iModal.fields.getTextInputValue(`pixKeyText`)
                                                        .trim()
                                                        .toLowerCase();
                                                    const pixKeyTypeInserted = iModal.fields.getTextInputValue(`pixKeyTypeText`)
                                                        .trim();

                                                    // set the information entered from the pix in dbConfigs (wio.db)
                                                    await dbConfigs.set(`semiAuto.pix.key`, pixKeyInserted);
                                                    await dbConfigs.set(`semiAuto.pix.keyType`, pixKeyTypeInserted);

                                                    // variables with informations of each payment method
                                                    const semiAutoPayment = await dbConfigs.get(`payments.paymentsOptions.semiAuto`);

                                                    // variables with informations of semi-auto
                                                    const semiAutoPix = await dbConfigs.get(`semiAuto.pix.key`);
                                                    const semiAutoPixType = await dbConfigs.get(`semiAuto.pix.keyType`);
                                                    const semiAutoQRCode = await dbConfigs.get(`semiAuto.qrCode`);

                                                    // row payments - semiauto - button
                                                    const rowPaymentsSemiAuto = new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`toggleSemiAuto`).setLabel(`Semi-Auto [ON/OFF]`).setEmoji(`🔧`).setStyle(semiAutoPayment ? `Success` : `Danger`),
                                                            new ButtonBuilder().setCustomId(`changePix`).setLabel(`Pix`).setEmoji(`💠`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`changeQrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`previousPaymentSemiAuto`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                        );

                                                    // embed payments - semiauto
                                                    const embedPaymentsSemiAuto = new EmbedBuilder()
                                                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                        .setTitle(`${client.user.username} | Semi-Auto`)
                                                        .setDescription(`**⚙ | Vendas Semi-Auto: ${semiAutoPayment ? `\`ON\`` : `\`OFF\``}\n💠 | Chave PIX: ${semiAutoPix != `none` ? `\`${semiAutoPix} | ${semiAutoPixType}\`` : `\`Não configurado.\``}\n🖼 | QR Code: ${semiAutoQRCode != `none` ? `[Link do QR Code](${semiAutoQRCode})` : `\`Não configurado.\``}**`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Configure usando os botões abaixo.` });

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedPaymentsSemiAuto],
                                                        components: [rowPaymentsSemiAuto]
                                                    });

                                                };

                                            });

                                        };

                                        // changeQrCode - button
                                        if (iPaymentsSemiAuto.customId == `changeQrCode`) {

                                            // create the modal
                                            const modal = new ModalBuilder()
                                                .setCustomId(`modalQrCode`)
                                                .setTitle(`🖼 | QR Code`);

                                            // creates the components for the modal
                                            const inputQrCode = new TextInputBuilder()
                                                .setCustomId('qrCodeText')
                                                .setLabel(`Link da Imagem: (QR Code)`)
                                                .setMaxLength(300)
                                                .setPlaceholder(`Digite "remover" para remover o atual ...`)
                                                .setRequired(true)
                                                .setStyle(`Paragraph`);

                                            // rows for components
                                            const iQrCodeLink = new ActionRowBuilder()
                                                .addComponents(inputQrCode);

                                            // add the rows to the modal
                                            await modal.addComponents(iQrCodeLink);

                                            // open the modal
                                            await iPaymentsSemiAuto.showModal(modal);

                                            // event - once - interactionCreate
                                            client.once("interactionCreate", async (iModal) => {

                                                // modalPix - modal
                                                if (iModal.customId == `modalQrCode`) {

                                                    // deferUpdate - postphone the update
                                                    await iModal.deferUpdate();

                                                    // informations inserteds
                                                    const qrCodeLinkInserted = iModal.fields.getTextInputValue(`qrCodeText`)
                                                        .trim();

                                                    // remove the current qr code
                                                    if (qrCodeLinkInserted == `remover`) {

                                                        // set the information entered from the pix in dbConfigs (wio.db)
                                                        await dbConfigs.set(`semiAuto.qrCode`, `none`);

                                                        // variables with informations of each payment method
                                                        const semiAutoPayment = await dbConfigs.get(`payments.paymentsOptions.semiAuto`);

                                                        // variables with informations of semi-auto
                                                        const semiAutoPix = await dbConfigs.get(`semiAuto.pix.key`);
                                                        const semiAutoPixType = await dbConfigs.get(`semiAuto.pix.keyType`);
                                                        const semiAutoQRCode = await dbConfigs.get(`semiAuto.qrCode`);

                                                        // row payments - semiauto - button
                                                        const rowPaymentsSemiAuto = new ActionRowBuilder()
                                                            .addComponents(
                                                                new ButtonBuilder().setCustomId(`toggleSemiAuto`).setLabel(`Semi-Auto [ON/OFF]`).setEmoji(`🔧`).setStyle(semiAutoPayment ? `Success` : `Danger`),
                                                                new ButtonBuilder().setCustomId(`changePix`).setLabel(`Pix`).setEmoji(`💠`).setStyle(`Primary`),
                                                                new ButtonBuilder().setCustomId(`changeQrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                                                                new ButtonBuilder().setCustomId(`previousPaymentSemiAuto`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                            );

                                                        // embed payments - semiauto
                                                        const embedPaymentsSemiAuto = new EmbedBuilder()
                                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                            .setTitle(`${client.user.username} | Semi-Auto`)
                                                            .setDescription(`**⚙ | Vendas Semi-Auto: ${semiAutoPayment ? `\`ON\`` : `\`OFF\``}\n💠 | Chave PIX: ${semiAutoPix != `none` ? `\`${semiAutoPix} | ${semiAutoPixType}\`` : `\`Não configurado.\``}\n🖼 | QR Code: ${semiAutoQRCode != `none` ? `[Link do QR Code](${semiAutoQRCode})` : `\`Não configurado.\``}**`)
                                                            .setColor(`NotQuiteBlack`)
                                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                                        // message - edit
                                                        await msg.edit({
                                                            embeds: [embedPaymentsSemiAuto],
                                                            components: [rowPaymentsSemiAuto]
                                                        });

                                                        return;
                                                    };

                                                    // invalid link
                                                    if (!url.parse(qrCodeLinkInserted).protocol || !url.parse(qrCodeLinkInserted).hostname) {
                                                        await iModal.followUp({
                                                            content: `❌ | O URL inserido não é válido.`,
                                                            ephemeral: true
                                                        });

                                                        return;
                                                    };

                                                    // set the information entered from the pix in dbConfigs (wio.db)
                                                    await dbConfigs.set(`semiAuto.qrCode`, qrCodeLinkInserted);

                                                    // variables with informations of each payment method
                                                    const semiAutoPayment = await dbConfigs.get(`payments.paymentsOptions.semiAuto`);

                                                    // variables with informations of semi-auto
                                                    const semiAutoPix = await dbConfigs.get(`semiAuto.pix.key`);
                                                    const semiAutoPixType = await dbConfigs.get(`semiAuto.pix.keyType`);
                                                    const semiAutoQRCode = await dbConfigs.get(`semiAuto.qrCode`);

                                                    // row payments - semiauto - button
                                                    const rowPaymentsSemiAuto = new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`toggleSemiAuto`).setLabel(`Semi-Auto [ON/OFF]`).setEmoji(`🔧`).setStyle(semiAutoPayment ? `Success` : `Danger`),
                                                            new ButtonBuilder().setCustomId(`changePix`).setLabel(`Pix`).setEmoji(`💠`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`changeQrCode`).setLabel(`QR Code`).setEmoji(`🖨`).setStyle(`Primary`),
                                                            new ButtonBuilder().setCustomId(`previousPaymentSemiAuto`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`),
                                                        );

                                                    // embed payments - semiauto
                                                    const embedPaymentsSemiAuto = new EmbedBuilder()
                                                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                        .setTitle(`${client.user.username} | Semi-Auto`)
                                                        .setDescription(`**⚙ | Vendas Semi-Auto: ${semiAutoPayment ? `\`ON\`` : `\`OFF\``}\n💠 | Chave PIX: ${semiAutoPix != `none` ? `\`${semiAutoPix} | ${semiAutoPixType}\`` : `\`Não configurado.\``}\n🖼 | QR Code: ${semiAutoQRCode != `none` ? `[Link do QR Code](${semiAutoQRCode})` : `\`Não configurado.\``}**`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Configure usando os botões abaixo.` });

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedPaymentsSemiAuto],
                                                        components: [rowPaymentsSemiAuto]
                                                    });

                                                };

                                            });

                                        };

                                        // previousPaymentSemiAuto - button
                                        if (iPaymentsSemiAuto.customId == `previousPaymentSemiAuto`) {

                                            // deferUpdate - postphone the update
                                            await iPaymentsSemiAuto.deferUpdate();

                                            // message - edit
                                            await msgPaymentsSemiAuto.edit({
                                                embeds: [embedPaymentsMethods],
                                                components: [rowPaymentsMethods]
                                            });

                                            // stop the collector (collectorPaymentSemiAuto)
                                            await collectorPaymentSemiAuto.stop();

                                        };

                                    });

                                });

                            };

                            // previousPaymentMethods - button
                            if (iPaymentMethods.customId == `previousPaymentMethods`) {

                                // deferUpdate - postphone the update
                                await iPaymentMethods.deferUpdate();

                                // new sales status via dbConfigs (wio.db)
                                const statusNewSales = await dbConfigs.get(`newSales`);

                                // row config - button (2)
                                const rowConfig2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`changeTerms`).setLabel(`Alterar os Termos de Compra`).setEmoji(`📜`).setStyle(`Primary`),
                                        new ButtonBuilder().setCustomId(`toggleNewSales`).setLabel(`Sistema de Vendas [ON/OFF]`).setEmoji(`🌎`).setStyle(statusNewSales ? `Success` : `Danger`),
                                        new ButtonBuilder().setCustomId(`addBotLink`).setLabel(`Link do BOT`).setEmoji(`🤖`).setStyle(`Secondary`)
                                    );

                                // embed config
                                const embedConfig = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Configurações`)
                                    .setDescription(`**🌎 | Sistema de Vendas: ${statusNewSales ? `\`ON\`` : `\`OFF\``}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `Configure usando as opções e botões abaixo.` });

                                // message - edit
                                await msgPaymentsMethods.edit({
                                    embeds: [embedConfig],
                                    components: [rowConfig1, rowConfig2]
                                });

                                // stop the collector (collectorPaymentMethods)
                                await collectorPaymentMethods.stop();

                            };

                        });

                    });

                };

                // configBot - option
                if (iManage.customId == `configBot`) {

                    // deferUpdate - postphone the update
                    await iManage.deferUpdate();

                    // row - bot configs - button (1)
                    const rowBotConfigs1 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`changeName`).setLabel(`Alterar Nome`).setEmoji(`⚙`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`changeAvatar`).setLabel(`Alterar Avatar`).setEmoji(`⚙`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`changeColor`).setLabel(`Alterar Cor Padrão`).setEmoji(`⚙`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`changeBanner`).setLabel(`Alterar Banner`).setEmoji(`⚙`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`changeThumbnail`).setLabel(`Alterar Miniatura`).setEmoji(`⚙`).setStyle(`Primary`)
                        );

                    // row - bot configs - button (2)
                    const rowBotConfigs2 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`changeStatus`).setLabel(`Alterar Status do BOT`).setEmoji(`⚙`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`previousBotConfigs`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                        );

                    // variables with bot informations (client)
                    const botName = client.user.username;
                    const botAvatar = client.user.avatarURL();

                    // variables with bot informations (dbConfigs)
                    const botColor = await dbConfigs.get(`embeds.color`);
                    const botBanner = await dbConfigs.get(`images.bannerUrl`);
                    const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                    // embed - bot configs
                    const embedBotConfigs = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`${client.user.username} | Configurações`)
                        .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `Configure usando os botões abaixo.` });

                    // message - edit
                    await msg.edit({
                        embeds: [embedBotConfigs],
                        components: [rowBotConfigs1, rowBotConfigs2]
                    }).then(async (msgBotConfigs) => {

                        // createMessageComponentCollector - collector
                        const collectorFilter = (i) => i.user.id == interaction.user.id;
                        const collectorBotConfigs = msgBotConfigs.createMessageComponentCollector({
                            filter: collectorFilter,
                            time: 600000
                        });
                        collectorBotConfigs.on("collect", async (iBotConfigs) => {

                            // changeName - button
                            if (iBotConfigs.customId == `changeName`) {

                                // create the modal
                                const modal = new ModalBuilder()
                                    .setCustomId(`modalBotName`)
                                    .setTitle(`🔎 | Nome do BOT`);

                                // creates the components for the modal
                                const inputNewName = new TextInputBuilder()
                                    .setCustomId('newNameText')
                                    .setLabel(`Novo Nome:`)
                                    .setMaxLength(38)
                                    .setPlaceholder(`Insira o novo nome do BOT ...`)
                                    .setRequired(true)
                                    .setStyle(`Paragraph`);

                                // rows for components
                                const iNewName = new ActionRowBuilder()
                                    .addComponents(inputNewName);

                                // add the rows to the modal
                                await modal.addComponents(iNewName);

                                // open the modal
                                await iBotConfigs.showModal(modal);

                                // event - once - interactionCreate
                                client.once("interactionCreate", async (iModal) => {

                                    // modalBotName - modal
                                    if (iModal.customId == `modalBotName`) {

                                        // deferUpdate - postphone the update
                                        await iModal.deferUpdate();

                                        // old informations
                                        const oldBotName = client.user.username;

                                        // informations inserteds
                                        const newNameInserted = iModal.fields.getTextInputValue(`newNameText`)
                                            .trim();

                                        // change the bot name
                                        await client.user.setUsername(newNameInserted)
                                            .then(async (result) => {

                                                // message - success
                                                await iModal.followUp({
                                                    content: `✅ | O nome \`${oldBotName}\` foi alterado para \`${newNameInserted}\`.`,
                                                    ephemeral: true
                                                });

                                                // variables with bot informations (client)
                                                const botName = client.user.username;
                                                const botAvatar = client.user.avatarURL();

                                                // variables with bot informations (dbConfigs)
                                                const botColor = await dbConfigs.get(`embeds.color`);
                                                const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                                const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                                // embed - bot configs
                                                const embedBotConfigs = new EmbedBuilder()
                                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                    .setTitle(`${client.user.username} | Configurações`)
                                                    .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                                // message - edit
                                                await msg.edit({
                                                    embeds: [embedBotConfigs],
                                                    components: [rowBotConfigs1, rowBotConfigs2]
                                                });

                                            }).catch(async (err) => {

                                                // message - error
                                                await iModal.followUp({
                                                    content: `❌ | Ocorreu um erro. Tente novamente em alguns minutos!`,
                                                    ephemeral: true
                                                });

                                            });

                                    };

                                });

                            };

                            // changeAvatar - button
                            if (iBotConfigs.customId == `changeAvatar`) {

                                // create the modal
                                const modal = new ModalBuilder()
                                    .setCustomId(`modalBotAvatar`)
                                    .setTitle(`🖼 | Avatar do BOT`);

                                // creates the components for the modal
                                const inputNewAvatar = new TextInputBuilder()
                                    .setCustomId('newAvatarText')
                                    .setLabel(`Novo Avatar:`)
                                    .setMaxLength(280)
                                    .setPlaceholder(`Insira o link do novo avatar do BOT ...`)
                                    .setRequired(true)
                                    .setStyle(`Paragraph`);

                                // rows for components
                                const iNewAvatar = new ActionRowBuilder()
                                    .addComponents(inputNewAvatar);

                                // add the rows to the modal
                                await modal.addComponents(iNewAvatar);

                                // open the modal
                                await iBotConfigs.showModal(modal);

                                // event - once - interactionCreate
                                client.once("interactionCreate", async (iModal) => {

                                    // modalBotName - modal
                                    if (iModal.customId == `modalBotAvatar`) {

                                        // deferUpdate - postphone the update
                                        await iModal.deferUpdate();

                                        // old informations
                                        const oldBotAvatar = client.user.avatarURL();

                                        // informations inserteds
                                        const newAvatarInserted = iModal.fields.getTextInputValue(`newAvatarText`)
                                            .trim();

                                        // invalid link
                                        if (!url.parse(newAvatarInserted).protocol || !url.parse(newAvatarInserted).hostname) {
                                            await iModal.followUp({
                                                content: `❌ | O URL inserido não é válido.`,
                                                ephemeral: true
                                            });

                                            return;
                                        };

                                        // change the bot name
                                        await client.user.setAvatar(newAvatarInserted)
                                            .then(async (result) => {

                                                // message - success
                                                await iModal.followUp({
                                                    content: `✅ | O avatar ${oldBotAvatar ? `[Link da Imagem](${oldBotAvatar})` : `\`Não configurado.\``} foi alterado para [Link da Imagem](${newAvatarInserted}).`,
                                                    ephemeral: true
                                                });

                                                // variables with bot informations (client)
                                                const botName = client.user.username;
                                                const botAvatar = client.user.avatarURL();

                                                // variables with bot informations (dbConfigs)
                                                const botColor = await dbConfigs.get(`embeds.color`);
                                                const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                                const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                                // embed - bot configs
                                                const embedBotConfigs = new EmbedBuilder()
                                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                    .setTitle(`${client.user.username} | Configurações`)
                                                    .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                                    .setColor(`NotQuiteBlack`)
                                                    .setFooter({ text: `Configure usando os botões abaixo.` });

                                                // message - edit
                                                await msg.edit({
                                                    embeds: [embedBotConfigs],
                                                    components: [rowBotConfigs1, rowBotConfigs2]
                                                });

                                            }).catch(async (err) => {

                                                // message - error
                                                await iModal.followUp({
                                                    content: `❌ | Ocorreu um erro. Tente novamente em alguns minutos!`,
                                                    ephemeral: true
                                                });

                                            });

                                    };

                                });

                            };

                            // changeColor - button
                            if (iBotConfigs.customId == `changeColor`) {

                                // create the modal
                                const modal = new ModalBuilder()
                                    .setCustomId(`modalBotColor`)
                                    .setTitle(`🖌 | Cor Padrão do BOT`);

                                // creates the components for the modal
                                const inputNewColor = new TextInputBuilder()
                                    .setCustomId('newColorText')
                                    .setLabel(`Nova Cor:`)
                                    .setMaxLength(7)
                                    .setPlaceholder(`Insira a nova cor padrão do BOT ...`)
                                    .setRequired(true)
                                    .setStyle(`Paragraph`);

                                // rows for components
                                const iNewColor = new ActionRowBuilder()
                                    .addComponents(inputNewColor);

                                // add the rows to the modal
                                await modal.addComponents(iNewColor);

                                // open the modal
                                await iBotConfigs.showModal(modal);

                                // event - once - interactionCreate
                                client.once("interactionCreate", async (iModal) => {

                                    // modalBotColor - modal
                                    if (iModal.customId == `modalBotColor`) {

                                        // deferUpdate - postphone the update
                                        await iModal.deferUpdate();

                                        // old informations
                                        const oldBotColor = await dbConfigs.get(`embeds.color`);

                                        // informations inserteds
                                        const newColorInserted = iModal.fields.getTextInputValue(`newColorText`)
                                            .trim();

                                        // invalid color format
                                        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
                                        if (!colorRegex.test(newColorInserted)) {
                                            await iModal.followUp({
                                                content: `❌ | Formato de cor inválido.`,
                                                ephemeral: true
                                            });

                                            return;
                                        };

                                        // set the new default color in dbConfigs (wio.db)
                                        await dbConfigs.set(`embeds.color`, newColorInserted);

                                        // message - success
                                        await iModal.followUp({
                                            content: `✅ | A cor padrão ${oldBotColor != `none` ? `\`${oldBotColor}\`` : `\`Não configurada.\``} foi alterada para \`${newColorInserted}\`.`,
                                            ephemeral: true
                                        });

                                        // variables with bot informations (client)
                                        const botName = client.user.username;
                                        const botAvatar = client.user.avatarURL();

                                        // variables with bot informations (dbConfigs)
                                        const botColor = await dbConfigs.get(`embeds.color`);
                                        const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                        const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                        // embed - bot configs
                                        const embedBotConfigs = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedBotConfigs],
                                            components: [rowBotConfigs1, rowBotConfigs2]
                                        });

                                    };

                                });

                            };

                            // changeBanner - button
                            if (iBotConfigs.customId == `changeBanner`) {

                                // create the modal
                                const modal = new ModalBuilder()
                                    .setCustomId(`modalBotBanner`)
                                    .setTitle(`🖼 | Banner do BOT`);

                                // creates the components for the modal
                                const inputNewBanner = new TextInputBuilder()
                                    .setCustomId('newBannerText')
                                    .setLabel(`Novo Banner:`)
                                    .setMaxLength(280)
                                    .setPlaceholder(`Digite "remover" para remover o atual ...`)
                                    .setRequired(true)
                                    .setStyle(`Paragraph`);

                                // rows for components
                                const iNewBanner = new ActionRowBuilder()
                                    .addComponents(inputNewBanner);

                                // add the rows to the modal
                                await modal.addComponents(iNewBanner);

                                // open the modal
                                await iBotConfigs.showModal(modal);

                                // event - once - interactionCreate
                                client.once("interactionCreate", async (iModal) => {

                                    // modalBotBanner - modal
                                    if (iModal.customId == `modalBotBanner`) {

                                        // deferUpdate - postphone the update
                                        await iModal.deferUpdate();

                                        // old informations
                                        const oldBotBanner = await dbConfigs.get(`images.bannerUrl`);

                                        // informations inserteds
                                        const newBannerInserted = iModal.fields.getTextInputValue(`newBannerText`)
                                            .trim();

                                        // checks if the entered text is the same as remove
                                        if (newBannerInserted == `remover`) {

                                            // remove information via dbConfigs (wio.db)
                                            await dbConfigs.set(`images.bannerUrl`, `none`);

                                            // variables with bot informations (client)
                                            const botName = client.user.username;
                                            const botAvatar = client.user.avatarURL();

                                            // variables with bot informations (dbConfigs)
                                            const botColor = await dbConfigs.get(`embeds.color`);
                                            const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                            const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                            // embed - bot configs
                                            const embedBotConfigs = new EmbedBuilder()
                                                .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                .setTitle(`${client.user.username} | Configurações`)
                                                .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                                .setColor(`NotQuiteBlack`)
                                                .setFooter({ text: `Configure usando os botões abaixo.` });

                                            // message - edit
                                            await msg.edit({
                                                embeds: [embedBotConfigs],
                                                components: [rowBotConfigs1, rowBotConfigs2]
                                            });

                                            return;
                                        };

                                        // invalid link
                                        if (!url.parse(newBannerInserted).protocol || !url.parse(newBannerInserted).hostname) {
                                            await iModal.followUp({
                                                content: `❌ | O URL inserido não é válido.`,
                                                ephemeral: true
                                            });

                                            return;
                                        };

                                        // set the new information in dbConfigs (wio.db)
                                        await dbConfigs.set(`images.bannerUrl`, newBannerInserted);

                                        // message - success
                                        await iModal.followUp({
                                            content: `✅ | O banner ${oldBotBanner != `none` ? `[Link da Imagem](${oldBotBanner})` : `\`Não configurado.\``} foi alterado para [Link da Imagem](${newBannerInserted}).`,
                                            ephemeral: true
                                        });

                                        // variables with bot informations (client)
                                        const botName = client.user.username;
                                        const botAvatar = client.user.avatarURL();

                                        // variables with bot informations (dbConfigs)
                                        const botColor = await dbConfigs.get(`embeds.color`);
                                        const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                        const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                        // embed - bot configs
                                        const embedBotConfigs = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedBotConfigs],
                                            components: [rowBotConfigs1, rowBotConfigs2]
                                        });

                                    };

                                });

                            };

                            // changeThumbnail - button
                            if (iBotConfigs.customId == `changeThumbnail`) {

                                // create the modal
                                const modal = new ModalBuilder()
                                    .setCustomId(`modalBotThumb`)
                                    .setTitle(`🖼 | Miniatura do BOT`);

                                // creates the components for the modal
                                const inputNewThumb = new TextInputBuilder()
                                    .setCustomId('newThumbText')
                                    .setLabel(`Nova Miniatura:`)
                                    .setMaxLength(280)
                                    .setPlaceholder(`Digite "remover" para remover a atual ...`)
                                    .setRequired(true)
                                    .setStyle(`Paragraph`);

                                // rows for components
                                const iNewThumb = new ActionRowBuilder()
                                    .addComponents(inputNewThumb);

                                // add the rows to the modal
                                await modal.addComponents(iNewThumb);

                                // open the modal
                                await iBotConfigs.showModal(modal);

                                // event - once - interactionCreate
                                client.once("interactionCreate", async (iModal) => {

                                    // modalBotThumb - modal
                                    if (iModal.customId == `modalBotThumb`) {

                                        // deferUpdate - postphone the update
                                        await iModal.deferUpdate();

                                        // old informations
                                        const oldBotThumb = await dbConfigs.get(`images.thumbUrl`);

                                        // informations inserteds
                                        const newThumbInserted = iModal.fields.getTextInputValue(`newThumbText`)
                                            .trim();

                                        // checks if the entered text is the same as remove
                                        if (newThumbInserted == `remover`) {

                                            // remove information via dbConfigs (wio.db)
                                            await dbConfigs.set(`images.thumbUrl`, `none`);

                                            // variables with bot informations (client)
                                            const botName = client.user.username;
                                            const botAvatar = client.user.avatarURL();

                                            // variables with bot informations (dbConfigs)
                                            const botColor = await dbConfigs.get(`embeds.color`);
                                            const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                            const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                            // embed - bot configs
                                            const embedBotConfigs = new EmbedBuilder()
                                                .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                .setTitle(`${client.user.username} | Configurações`)
                                                .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                                .setColor(`NotQuiteBlack`)
                                                .setFooter({ text: `Configure usando os botões abaixo.` });

                                            // message - edit
                                            await msg.edit({
                                                embeds: [embedBotConfigs],
                                                components: [rowBotConfigs1, rowBotConfigs2]
                                            });

                                            return;
                                        };

                                        // invalid link
                                        if (!url.parse(newThumbInserted).protocol || !url.parse(newThumbInserted).hostname) {
                                            await iModal.followUp({
                                                content: `❌ | O URL inserido não é válido.`,
                                                ephemeral: true
                                            });

                                            return;
                                        };

                                        // set the new information in dbConfigs (wio.db)
                                        await dbConfigs.set(`images.thumbUrl`, newThumbInserted);

                                        // message - success
                                        await iModal.followUp({
                                            content: `✅ | A miniatura ${oldBotThumb != `none` ? `[Link da Imagem](${oldBotThumb})` : `\`Não configurada.\``} foi alterada para [Link da Imagem](${newThumbInserted}).`,
                                            ephemeral: true
                                        });

                                        // variables with bot informations (client)
                                        const botName = client.user.username;
                                        const botAvatar = client.user.avatarURL();

                                        // variables with bot informations (dbConfigs)
                                        const botColor = await dbConfigs.get(`embeds.color`);
                                        const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                        const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                        // embed - bot configs
                                        const embedBotConfigs = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedBotConfigs],
                                            components: [rowBotConfigs1, rowBotConfigs2]
                                        });

                                    };

                                });

                            };

                            // changeStatus - button
                            if (iBotConfigs.customId == `changeStatus`) {

                                // deferUpdate - postphone the update
                                await iBotConfigs.deferUpdate();

                                // row - panel - status (1)
                                const rowPanelStatus1 = new ActionRowBuilder()
                                    .addComponents(
                                        new StringSelectMenuBuilder().setCustomId(`typeActivity`).setPlaceholder(`Selecione uma opção`)
                                            .setOptions(
                                                new StringSelectMenuOptionBuilder().setLabel(`Jogando`).setDescription(`EX: (Jogando One)`).setEmoji(`🕹`).setValue(`typePlaying`),
                                                new StringSelectMenuOptionBuilder().setLabel(`Assistindo`).setDescription(`EX: (Assistindo: One)`).setEmoji(`📺`).setValue(`typeWatching`),
                                                new StringSelectMenuOptionBuilder().setLabel(`Competindo`).setDescription(`EX: (Competindo em: One)`).setEmoji(`🎮`).setValue(`typeCompeting`),
                                                new StringSelectMenuOptionBuilder().setLabel(`Transmitindo`).setDescription(`EX: (Transmitindo One)`).setEmoji(`📡`).setValue(`typeStreaming`),
                                                new StringSelectMenuOptionBuilder().setLabel(`Personalizado`).setDescription(`EX: (One Apps)`).setEmoji(`👤`).setValue(`typeCustom`)
                                            )
                                    );

                                // row - panel - status (2)
                                const rowPanelStatus2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`previousBotStatus`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                    );

                                // embed - panel - status
                                const embedPanelStatus = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Status`)
                                    .setDescription(`**⚙ | Escolha o tipo de atividade no menu abaixo.**`)
                                    .setColor(`NotQuiteBlack`)

                                // reply - panel
                                await msg.edit({
                                    embeds: [embedPanelStatus],
                                    components: [rowPanelStatus1, rowPanelStatus2]
                                });

                                // createMessageComponentCollector - collector
                                const collectorStatus = msg.createMessageComponentCollector({
                                    time: 600000
                                });
                                collectorStatus.on("collect", async (iStatus) => {

                                    // typeActivity - select menu
                                    if (iStatus.customId == `typeActivity`) {

                                        // uncheck the option - select menu
                                        await msg.edit({
                                            components: [rowPanelStatus1, rowPanelStatus2]
                                        });

                                        // value id
                                        const valueId = iStatus.values[0];

                                        // changes the type of activity in the variable
                                        if (valueId == `typePlaying`) {

                                            // create the modal
                                            const modal = new ModalBuilder()
                                                .setCustomId(`modalBotStatus`)
                                                .setTitle(`🕹 | Jogando`);

                                            // creates the components for the modal
                                            const inputNewStatus = new TextInputBuilder()
                                                .setCustomId('newStatusText')
                                                .setLabel(`Texto do Status:`)
                                                .setMaxLength(28)
                                                .setPlaceholder(`EX: Vendas Automáticas`)
                                                .setRequired(true)
                                                .setStyle(`Short`);

                                            // rows for components
                                            const iNewStatus = new ActionRowBuilder()
                                                .addComponents(inputNewStatus);

                                            // add the rows to the modal
                                            await modal.addComponents(iNewStatus);

                                            // open the modal
                                            await iStatus.showModal(modal);

                                            // event - once - interactionCreate
                                            client.once("interactionCreate", async (iModal) => {

                                                // modalBotStatus - modal
                                                if (iModal.customId == `modalBotStatus`) {

                                                    // deferUpdate - postphone the update
                                                    await iModal.deferUpdate();

                                                    // informations inserteds
                                                    const newStatusText = iModal.fields.getTextInputValue(`newStatusText`)
                                                        .trim();

                                                    // change bot status
                                                    client.user.setActivity(newStatusText, {
                                                        type: ActivityType.Playing
                                                    });

                                                    // variables with bot informations (client)
                                                    const botName = client.user.username;
                                                    const botAvatar = client.user.avatarURL();

                                                    // variables with bot informations (dbConfigs)
                                                    const botColor = await dbConfigs.get(`embeds.color`);
                                                    const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                                    const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                                    // embed - bot configs
                                                    const embedBotConfigs = new EmbedBuilder()
                                                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                        .setTitle(`${client.user.username} | Configurações`)
                                                        .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Configure usando os botões abaixo.` });

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedBotConfigs],
                                                        components: [rowBotConfigs1, rowBotConfigs2]
                                                    });

                                                    // stop the collector (collectorStatus)
                                                    await collectorStatus.stop();

                                                };

                                            });

                                        } else if (valueId == `typeWatching`) {

                                            // create the modal
                                            const modal = new ModalBuilder()
                                                .setCustomId(`modalBotStatus`)
                                                .setTitle(`📺 | Assistindo`);

                                            // creates the components for the modal
                                            const inputNewStatus = new TextInputBuilder()
                                                .setCustomId('newStatusText')
                                                .setLabel(`Texto do Status:`)
                                                .setMaxLength(28)
                                                .setPlaceholder(`EX: Vendas Automáticas`)
                                                .setRequired(true)
                                                .setStyle(`Short`);

                                            // rows for components
                                            const iNewStatus = new ActionRowBuilder()
                                                .addComponents(inputNewStatus);

                                            // add the rows to the modal
                                            await modal.addComponents(iNewStatus);

                                            // open the modal
                                            await iStatus.showModal(modal);

                                            // event - once - interactionCreate
                                            client.once("interactionCreate", async (iModal) => {

                                                // modalBotStatus - modal
                                                if (iModal.customId == `modalBotStatus`) {

                                                    // deferUpdate - postphone the update
                                                    await iModal.deferUpdate();

                                                    // informations inserteds
                                                    const newStatusText = iModal.fields.getTextInputValue(`newStatusText`)
                                                        .trim();

                                                    // change bot status
                                                    client.user.setActivity(newStatusText, {
                                                        type: ActivityType.Watching
                                                    });

                                                    // variables with bot informations (client)
                                                    const botName = client.user.username;
                                                    const botAvatar = client.user.avatarURL();

                                                    // variables with bot informations (dbConfigs)
                                                    const botColor = await dbConfigs.get(`embeds.color`);
                                                    const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                                    const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                                    // embed - bot configs
                                                    const embedBotConfigs = new EmbedBuilder()
                                                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                        .setTitle(`${client.user.username} | Configurações`)
                                                        .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Configure usando os botões abaixo.` });

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedBotConfigs],
                                                        components: [rowBotConfigs1, rowBotConfigs2]
                                                    });

                                                    // stop the collector (collectorStatus)
                                                    await collectorStatus.stop();

                                                };

                                            });

                                        } else if (valueId == `typeCompeting`) {

                                            // create the modal
                                            const modal = new ModalBuilder()
                                                .setCustomId(`modalBotStatus`)
                                                .setTitle(`🎮 | Competindo`);

                                            // creates the components for the modal
                                            const inputNewStatus = new TextInputBuilder()
                                                .setCustomId('newStatusText')
                                                .setLabel(`Texto do Status:`)
                                                .setMaxLength(28)
                                                .setPlaceholder(`EX: Vendas Automáticas`)
                                                .setRequired(true)
                                                .setStyle(`Short`);

                                            // rows for components
                                            const iNewStatus = new ActionRowBuilder()
                                                .addComponents(inputNewStatus);

                                            // add the rows to the modal
                                            await modal.addComponents(iNewStatus);

                                            // open the modal
                                            await iStatus.showModal(modal);

                                            // event - once - interactionCreate
                                            client.once("interactionCreate", async (iModal) => {

                                                // modalBotStatus - modal
                                                if (iModal.customId == `modalBotStatus`) {

                                                    // deferUpdate - postphone the update
                                                    await iModal.deferUpdate();

                                                    // informations inserteds
                                                    const newStatusText = iModal.fields.getTextInputValue(`newStatusText`)
                                                        .trim();

                                                    // change bot status
                                                    client.user.setActivity(newStatusText, {
                                                        type: ActivityType.Competing
                                                    });

                                                    // variables with bot informations (client)
                                                    const botName = client.user.username;
                                                    const botAvatar = client.user.avatarURL();

                                                    // variables with bot informations (dbConfigs)
                                                    const botColor = await dbConfigs.get(`embeds.color`);
                                                    const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                                    const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                                    // embed - bot configs
                                                    const embedBotConfigs = new EmbedBuilder()
                                                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                        .setTitle(`${client.user.username} | Configurações`)
                                                        .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Configure usando os botões abaixo.` });

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedBotConfigs],
                                                        components: [rowBotConfigs1, rowBotConfigs2]
                                                    });

                                                    // stop the collector (collectorStatus)
                                                    await collectorStatus.stop();

                                                };

                                            });

                                        } else if (valueId == `typeStreaming`) {

                                            // create the modal
                                            const modal = new ModalBuilder()
                                                .setCustomId(`modalBotStatus`)
                                                .setTitle(`📡 | Transmitindo`);

                                            // creates the components for the modal (1)
                                            const inputNewStatus1 = new TextInputBuilder()
                                                .setCustomId('newStatusText')
                                                .setLabel(`Texto do Status:`)
                                                .setMaxLength(28)
                                                .setPlaceholder(`EX: Vendas Automáticas`)
                                                .setRequired(true)
                                                .setStyle(`Short`);

                                            // creates the components for the modal (1)
                                            const inputNewStatus2 = new TextInputBuilder()
                                                .setCustomId('newStatusUrl')
                                                .setLabel(`Link da Transmissão: (Opcional)`)
                                                .setMaxLength(380)
                                                .setPlaceholder(`EX: https://twitch.tv/123`)
                                                .setRequired(false)
                                                .setStyle(`Paragraph`);

                                            // rows for components (1)
                                            const iNewStatus1 = new ActionRowBuilder()
                                                .addComponents(inputNewStatus1);

                                            // rows for components (1)
                                            const iNewStatus2 = new ActionRowBuilder()
                                                .addComponents(inputNewStatus2);

                                            // add the rows to the modal
                                            await modal.addComponents(iNewStatus1, iNewStatus2);

                                            // open the modal
                                            await iStatus.showModal(modal);

                                            // event - once - interactionCreate
                                            client.once("interactionCreate", async (iModal) => {

                                                // modalBotStatus - modal
                                                if (iModal.customId == `modalBotStatus`) {

                                                    // deferUpdate - postphone the update
                                                    await iModal.deferUpdate();

                                                    // informations inserteds
                                                    const newStatusText = iModal.fields.getTextInputValue(`newStatusText`)
                                                        .trim();

                                                    const newStatusUrl = iModal.fields.getTextInputValue(`newStatusUrl`)
                                                        .trim() || `https://twitch.tv/123`;

                                                    // change bot status
                                                    client.user.setActivity(newStatusText, {
                                                        type: ActivityType.Streaming,
                                                        url: newStatusUrl
                                                    });

                                                    // variables with bot informations (client)
                                                    const botName = client.user.username;
                                                    const botAvatar = client.user.avatarURL();

                                                    // variables with bot informations (dbConfigs)
                                                    const botColor = await dbConfigs.get(`embeds.color`);
                                                    const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                                    const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                                    // embed - bot configs
                                                    const embedBotConfigs = new EmbedBuilder()
                                                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                        .setTitle(`${client.user.username} | Configurações`)
                                                        .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Configure usando os botões abaixo.` });

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedBotConfigs],
                                                        components: [rowBotConfigs1, rowBotConfigs2]
                                                    });

                                                    // stop the collector (collectorStatus)
                                                    await collectorStatus.stop();

                                                };

                                            });

                                        } else if (valueId == `typeCustom`) {

                                            // create the modal
                                            const modal = new ModalBuilder()
                                                .setCustomId(`modalBotStatus`)
                                                .setTitle(`👤 | Personalizado`);

                                            // creates the components for the modal
                                            const inputNewStatus = new TextInputBuilder()
                                                .setCustomId('newStatusText')
                                                .setLabel(`Texto do Status:`)
                                                .setMaxLength(28)
                                                .setPlaceholder(`EX: Vendas Automáticas`)
                                                .setRequired(true)
                                                .setStyle(`Short`);

                                            // rows for components
                                            const iNewStatus = new ActionRowBuilder()
                                                .addComponents(inputNewStatus);

                                            // add the rows to the modal
                                            await modal.addComponents(iNewStatus);

                                            // open the modal
                                            await iStatus.showModal(modal);

                                            // event - once - interactionCreate
                                            client.once("interactionCreate", async (iModal) => {

                                                // modalBotStatus - modal
                                                if (iModal.customId == `modalBotStatus`) {

                                                    // deferUpdate - postphone the update
                                                    await iModal.deferUpdate();

                                                    // informations inserteds
                                                    const newStatusText = iModal.fields.getTextInputValue(`newStatusText`)
                                                        .trim();

                                                    // change bot status
                                                    client.user.setActivity(newStatusText, {
                                                        type: ActivityType.Custom
                                                    });

                                                    // variables with bot informations (client)
                                                    const botName = client.user.username;
                                                    const botAvatar = client.user.avatarURL();

                                                    // variables with bot informations (dbConfigs)
                                                    const botColor = await dbConfigs.get(`embeds.color`);
                                                    const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                                    const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                                    // embed - bot configs
                                                    const embedBotConfigs = new EmbedBuilder()
                                                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                                        .setTitle(`${client.user.username} | Configurações`)
                                                        .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                                        .setColor(`NotQuiteBlack`)
                                                        .setFooter({ text: `Configure usando os botões abaixo.` });

                                                    // message - edit
                                                    await msg.edit({
                                                        embeds: [embedBotConfigs],
                                                        components: [rowBotConfigs1, rowBotConfigs2]
                                                    });

                                                    // stop the collector (collectorStatus)
                                                    await collectorStatus.stop();

                                                };

                                            });

                                        };

                                    };

                                    // previousBotStatus - button
                                    if (iStatus.customId == `previousBotStatus`) {

                                        // deferUpdate - postphone the update
                                        await iStatus.deferUpdate();

                                        // variables with bot informations (client)
                                        const botName = client.user.username;
                                        const botAvatar = client.user.avatarURL();

                                        // variables with bot informations (dbConfigs)
                                        const botColor = await dbConfigs.get(`embeds.color`);
                                        const botBanner = await dbConfigs.get(`images.bannerUrl`);
                                        const botThumbnail = await dbConfigs.get(`images.thumbUrl`);

                                        // embed - bot configs
                                        const embedBotConfigs = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Nome: \`${botName}\`\n• Avatar: ${botAvatar ? `[Link da Imagem](${botAvatar})` : `\`Não configurado.\``}\n• Cor Padrão: ${botColor != `none` ? `\`${botColor}\`` : `\`Não configurado.\``}\n• Banner: ${botBanner != `none` ? `[Link da Imagem](${botBanner})` : `\`Não configurado.\``}\n• Miniatura: ${botThumbnail != `none` ? `[Link da Imagem](${botThumbnail})` : `\`Não configurado.\``}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedBotConfigs],
                                            components: [rowBotConfigs1, rowBotConfigs2]
                                        });

                                        // stop the collector (collectorStatus)
                                        await collectorStatus.stop();

                                    };

                                });

                            };

                            // previousBotConfigs - button
                            if (iBotConfigs.customId == `previousBotConfigs`) {

                                // deferUpdate - postphone the update
                                await iBotConfigs.deferUpdate();

                                // new sales status via dbConfigs (wio.db)
                                const statusNewSales = await dbConfigs.get(`newSales`);

                                // row config - button (2)
                                const rowConfig2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`changeTerms`).setLabel(`Alterar os Termos de Compra`).setEmoji(`📜`).setStyle(`Primary`),
                                        new ButtonBuilder().setCustomId(`toggleNewSales`).setLabel(`Sistema de Vendas [ON/OFF]`).setEmoji(`🌎`).setStyle(statusNewSales ? `Success` : `Danger`),
                                        new ButtonBuilder().setCustomId(`addBotLink`).setLabel(`Link do BOT`).setEmoji(`🤖`).setStyle(`Secondary`)
                                    );

                                // embed config
                                const embedConfig = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Configurações`)
                                    .setDescription(`**🌎 | Sistema de Vendas: ${statusNewSales ? `\`ON\`` : `\`OFF\``}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `Configure usando as opções e botões abaixo.` });

                                // message - edit
                                await msgBotConfigs.edit({
                                    embeds: [embedConfig],
                                    components: [rowConfig1, rowConfig2]
                                });

                                // stop the collector (collectorBotConfigs)
                                await collectorBotConfigs.stop();

                            };

                        });

                    });

                };

                // configChannels - option
                if (iManage.customId == `configChannels`) {

                    // deferUpdate - postphone the update
                    await iManage.deferUpdate();

                    // row - channels config - button
                    const rowChannelsConfig = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`changeLogsPriv`).setLabel(`Alterar Canal de Logs Privadas`).setEmoji(`⚙`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`changeLogsPublic`).setLabel(`Alterar Canal de Logs Públicas`).setEmoji(`⚙`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`changeCategoryCart`).setLabel(`Alterar Categoria de Carrinhos`).setEmoji(`⚙`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`changeRoleCustomer`).setLabel(`Alterar Cargo de Cliente`).setEmoji(`⚙`).setStyle(`Primary`),
                            new ButtonBuilder().setCustomId(`previousChannelsConfig`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                        );

                    // variables with configs information
                    const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                    const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                    const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                    const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                    // variables with configs information formatted
                    const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                    const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                    const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                    const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                    // embed - channels config
                    const embedChannelsConfig = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`${client.user.username} | Configurações`)
                        .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                        .setColor(`NotQuiteBlack`)
                        .setFooter({ text: `Configure usando os botões abaixo.` });

                    // message - edit
                    await msg.edit({
                        embeds: [embedChannelsConfig],
                        components: [rowChannelsConfig]
                    }).then(async (msgChannelsConfig) => {

                        // createMessageComponentCollector - collector
                        const collectorFilter = (i) => i.user.id == interaction.user.id;
                        const collectorChannelsConfig = msgChannelsConfig.createMessageComponentCollector({
                            filter: collectorFilter,
                            time: 600000
                        });
                        collectorChannelsConfig.on("collect", async (iChannelsConfig) => {

                            // changeLogsPriv - button
                            if (iChannelsConfig.customId == `changeLogsPriv`) {

                                // deferUpdate - postphone the update
                                await iChannelsConfig.deferUpdate();

                                // row - channels (1)
                                const rowChannels1 = new ActionRowBuilder()
                                    .addComponents(
                                        new ChannelSelectMenuBuilder()
                                            .setCustomId(`channelsMenu`)
                                            .addChannelTypes(ChannelType.GuildText)
                                            .setPlaceholder(`Selecione um Canal`)
                                    );

                                // row - channels (2)
                                const rowChannels2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`removeLogsPriv`).setLabel(`Remover Canal`).setEmoji(`🗑`).setStyle(`Danger`),
                                        new ButtonBuilder().setCustomId(`previousLogsPrivConfig`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                    );

                                // embed - channels
                                const embedChannels = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Canais`)
                                    .setDescription(`**⚙ | Selecione um canal de logs privadas.**`)
                                    .setColor(`NotQuiteBlack`);

                                // message - edit
                                await msg.edit({
                                    embeds: [embedChannels],
                                    components: [rowChannels1, rowChannels2]
                                });

                                // try catch
                                try {

                                    // awaitMessageComponent - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 600000 });

                                    // channelsMenu - select menu
                                    if (iAwait.customId == `channelsMenu`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // value id
                                        const valueId = iAwait.values[0];

                                        // set the information in dbConfigs (wio.db)
                                        await dbConfigs.set(`channels.channelLogsPrivId`, valueId);

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                    // removeLogsPriv - button
                                    if (iAwait.customId == `removeLogsPriv`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // remove the information in dbConfigs (wio.db)
                                        await dbConfigs.set(`channels.channelLogsPrivId`, `none`);

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                    // previousLogsPrivConfig - button
                                    if (iAwait.customId == `previousLogsPrivConfig`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                } catch (err) {
                                    return;
                                };

                            };

                            // changeLogsPublic - button
                            if (iChannelsConfig.customId == `changeLogsPublic`) {

                                // deferUpdate - postphone the update
                                await iChannelsConfig.deferUpdate();

                                // row - channels (1)
                                const rowChannels1 = new ActionRowBuilder()
                                    .addComponents(
                                        new ChannelSelectMenuBuilder()
                                            .setCustomId(`channelsMenu`)
                                            .addChannelTypes(ChannelType.GuildText)
                                            .setPlaceholder(`Selecione um Canal`)
                                    );

                                // row - channels (2)
                                const rowChannels2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`removeLogsPublic`).setLabel(`Remover Canal`).setEmoji(`🗑`).setStyle(`Danger`),
                                        new ButtonBuilder().setCustomId(`previousLogsPublicConfig`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                    );

                                // embed - channels
                                const embedChannels = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Canais`)
                                    .setDescription(`**⚙ | Selecione um canal de logs públicas.**`)
                                    .setColor(`NotQuiteBlack`);

                                // message - edit
                                await msg.edit({
                                    embeds: [embedChannels],
                                    components: [rowChannels1, rowChannels2]
                                });

                                // try catch
                                try {

                                    // awaitMessageComponent - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 600000 });

                                    // channelsMenu - select menu
                                    if (iAwait.customId == `channelsMenu`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // value id
                                        const valueId = iAwait.values[0];

                                        // set the information in dbConfigs (wio.db)
                                        await dbConfigs.set(`channels.channelLogsPublicId`, valueId);

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                    // removeLogsPublic - button
                                    if (iAwait.customId == `removeLogsPublic`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // remove the information in dbConfigs (wio.db)
                                        await dbConfigs.set(`channels.channelLogsPublicId`, `none`);

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                    // previousLogsPublicConfig - button
                                    if (iAwait.customId == `previousLogsPublicConfig`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                } catch (err) {
                                    return;
                                };

                            };

                            // changeCategoryCart - button
                            if (iChannelsConfig.customId == `changeCategoryCart`) {

                                // deferUpdate - postphone the update
                                await iChannelsConfig.deferUpdate();

                                // row - channels (1)
                                const rowChannels1 = new ActionRowBuilder()
                                    .addComponents(
                                        new ChannelSelectMenuBuilder()
                                            .setCustomId(`channelsMenu`)
                                            .addChannelTypes(ChannelType.GuildCategory)
                                            .setPlaceholder(`Selecione uma Categoria`)
                                    );

                                // row - channels (2)
                                const rowChannels2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`previousCategoryCartConfig`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                    );

                                // embed - channels
                                const embedChannels = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Canais`)
                                    .setDescription(`**⚙ | Selecione uma categoria de abertura dos carrinhos.**`)
                                    .setColor(`NotQuiteBlack`);

                                // message - edit
                                await msg.edit({
                                    embeds: [embedChannels],
                                    components: [rowChannels1, rowChannels2]
                                });

                                // try catch
                                try {

                                    // awaitMessageComponent - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 600000 });

                                    // channelsMenu - select menu
                                    if (iAwait.customId == `channelsMenu`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // value id
                                        const valueId = iAwait.values[0];

                                        // set the information in dbConfigs (wio.db)
                                        await dbConfigs.set(`channels.categoryCartsId`, valueId);

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                    // previousCategoryCartConfig - button
                                    if (iAwait.customId == `previousCategoryCartConfig`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                } catch (err) {
                                    return;
                                };

                            };

                            // changeRoleCustomer - button
                            if (iChannelsConfig.customId == `changeRoleCustomer`) {

                                // deferUpdate - postphone the update
                                await iChannelsConfig.deferUpdate();

                                // row - roles (1)
                                const rowRoles1 = new ActionRowBuilder()
                                    .addComponents(
                                        new RoleSelectMenuBuilder()
                                            .setCustomId(`rolesMenu`)
                                            .setPlaceholder(`Selecione um Cargo`)
                                    );

                                // row - roles (2)
                                const rowRoles2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`removeRoleCustomer`).setLabel(`Remover Cargo`).setEmoji(`🗑`).setStyle(`Danger`),
                                        new ButtonBuilder().setCustomId(`previousRoleCustomerConfig`).setLabel(`Voltar`).setEmoji(`⬅`).setStyle(`Secondary`)
                                    );

                                // embed - roles
                                const embedRoles = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Cargos`)
                                    .setDescription(`**⚙ | Selecione um cargo para os clientes**`)
                                    .setColor(`NotQuiteBlack`);

                                // message - edit
                                await msg.edit({
                                    embeds: [embedRoles],
                                    components: [rowRoles1, rowRoles2]
                                });

                                // try catch
                                try {

                                    // awaitMessageComponent - collector
                                    const collectorFilter = (i) => i.user.id == interaction.user.id;
                                    const iAwait = await msg.awaitMessageComponent({ filter: collectorFilter, time: 600000 });

                                    // rolesMenu - select menu
                                    if (iAwait.customId == `rolesMenu`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // value id
                                        const valueId = iAwait.values[0];

                                        // set the information in dbConfigs (wio.db)
                                        await dbConfigs.set(`roles.roleCustomerId`, valueId);

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                    // removeRoleCustomer - button
                                    if (iAwait.customId == `removeRoleCustomer`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // remove the information in dbConfigs (wio.db)
                                        await dbConfigs.set(`roles.roleCustomerId`, `none`);

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                    // previousRoleCustomerConfig - button
                                    if (iAwait.customId == `previousRoleCustomerConfig`) {

                                        // deferUpdate - postphone the update
                                        await iAwait.deferUpdate();

                                        // variables with configs information
                                        const channelLogsPriv = await dbConfigs.get(`channels.channelLogsPrivId`);
                                        const channelLogsPublic = await dbConfigs.get(`channels.channelLogsPublicId`);
                                        const categoryCart = await dbConfigs.get(`channels.categoryCartsId`);
                                        const roleCustomer = await dbConfigs.get(`roles.roleCustomerId`);

                                        // variables with configs information formatted
                                        const channelLogsPrivFormatted = channelLogsPriv != "none" ? iManage.guild.channels.cache.get(channelLogsPriv) || `\`${channelLogsPriv} não encontrado.\`` : `\`Não configurado.\``;
                                        const channelLogsPublicFormatted = channelLogsPublic != "none" ? iManage.guild.channels.cache.get(channelLogsPublic) || `\`${channelLogsPublic} não encontrado.\`` : `\`Não configurado.\``;
                                        const categoryCartFormatted = categoryCart != "none" ? iManage.guild.channels.cache.get(categoryCart) || `\`${categoryCart} não encontrado.\`` : `\`Não configurado.\``;
                                        const roleCustomerFormatted = roleCustomer != "none" ? iManage.guild.roles.cache.get(roleCustomer) || `\`${roleCustomer} não encontrado.\`` : `\`Não configurado.\``;

                                        // embed - channels config
                                        const embedChannelsConfig = new EmbedBuilder()
                                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                            .setTitle(`${client.user.username} | Configurações`)
                                            .setDescription(`**• Canal de Logs Privadas: ${channelLogsPrivFormatted}\n• Canal de Logs Públicas: ${channelLogsPublicFormatted}\n• Categoria de Carrinhos: ${categoryCartFormatted}\n• Cargo de Cliente: ${roleCustomerFormatted}**`)
                                            .setColor(`NotQuiteBlack`)
                                            .setFooter({ text: `Configure usando os botões abaixo.` });

                                        // message - edit
                                        await msg.edit({
                                            embeds: [embedChannelsConfig],
                                            components: [rowChannelsConfig]
                                        });

                                    };

                                } catch (err) {
                                    return;
                                };

                            };

                            // previousChannelsConfig - button
                            if (iChannelsConfig.customId == `previousChannelsConfig`) {

                                // deferUpdate - postphone the update
                                await iChannelsConfig.deferUpdate();

                                // new sales status via dbConfigs (wio.db)
                                const statusNewSales = await dbConfigs.get(`newSales`);

                                // row config - button (2)
                                const rowConfig2 = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId(`changeTerms`).setLabel(`Alterar os Termos de Compra`).setEmoji(`📜`).setStyle(`Primary`),
                                        new ButtonBuilder().setCustomId(`toggleNewSales`).setLabel(`Sistema de Vendas [ON/OFF]`).setEmoji(`🌎`).setStyle(statusNewSales ? `Success` : `Danger`),
                                        new ButtonBuilder().setCustomId(`addBotLink`).setLabel(`Link do BOT`).setEmoji(`🤖`).setStyle(`Secondary`)
                                    );

                                // embed config
                                const embedConfig = new EmbedBuilder()
                                    .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                                    .setTitle(`${client.user.username} | Configurações`)
                                    .setDescription(`**🌎 | Sistema de Vendas: ${statusNewSales ? `\`ON\`` : `\`OFF\``}**`)
                                    .setColor(`NotQuiteBlack`)
                                    .setFooter({ text: `Configure usando as opções e botões abaixo.` });

                                // message - edit
                                await msgChannelsConfig.edit({
                                    embeds: [embedConfig],
                                    components: [rowConfig1, rowConfig2]
                                });

                                // stop the collector (collectorChannelsConfig)
                                await collectorChannelsConfig.stop();

                            };

                        });

                    });

                };

                // toggleNewSales - button
                if (iManage.customId == `toggleNewSales`) {

                    // deferUpdate - postphone the update
                    await iManage.deferUpdate();

                    // checks if the status is true
                    const statusNewSales = await dbConfigs.get(`newSales`);
                    if (statusNewSales) {

                        // set the new sales status to false via dbConfigs (wio.db)
                        await dbConfigs.set(`newSales`, false);

                        // row config - button (2)
                        const rowConfig2 = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`changeTerms`).setLabel(`Alterar os Termos de Compra`).setEmoji(`📜`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`toggleNewSales`).setLabel(`Sistema de Vendas [ON/OFF]`).setEmoji(`🌎`).setStyle(`Danger`),
                                new ButtonBuilder().setCustomId(`addBotLink`).setLabel(`Link do BOT`).setEmoji(`🤖`).setStyle(`Secondary`),
                            );

                        // embed config
                        const embedConfig = new EmbedBuilder()
                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                            .setTitle(`${client.user.username} | Configurações`)
                            .setDescription(`**🌎 | Sistema de Vendas: \`OFF\`**`)
                            .setColor(`NotQuiteBlack`)
                            .setFooter({ text: `Configure usando as opções e botões abaixo.` });

                        // message - edit
                        await msg.edit({
                            embeds: [embedConfig],
                            components: [rowConfig1, rowConfig2]
                        });

                    } else {

                        // set the new sales status to true via dbConfigs (wio.db)
                        await dbConfigs.set(`newSales`, true);

                        // row config - button (2)
                        const rowConfig2 = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`changeTerms`).setLabel(`Alterar os Termos de Compra`).setEmoji(`📜`).setStyle(`Primary`),
                                new ButtonBuilder().setCustomId(`toggleNewSales`).setLabel(`Sistema de Vendas [ON/OFF]`).setEmoji(`🌎`).setStyle(`Success`),
                                new ButtonBuilder().setCustomId(`addBotLink`).setLabel(`Link do BOT`).setEmoji(`🤖`).setStyle(`Secondary`),
                            );

                        // embed config
                        const embedConfig = new EmbedBuilder()
                            .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                            .setTitle(`${client.user.username} | Configurações`)
                            .setDescription(`**🌎 | Sistema de Vendas: \`ON\`**`)
                            .setColor(`NotQuiteBlack`)
                            .setFooter({ text: `Configure usando as opções e botões abaixo.` });

                        // message - edit
                        await msg.edit({
                            embeds: [embedConfig],
                            components: [rowConfig1, rowConfig2]
                        });

                    };

                };

                // changeTerms - button
                if (iManage.customId == `changeTerms`) {

                    // create the modal
                    const modal = new ModalBuilder()
                        .setCustomId(`modalTerms`)
                        .setTitle(`📚 | Termos`);

                    // creates the components for the modal
                    const inputNewTerms = new TextInputBuilder()
                        .setCustomId('newTermsText')
                        .setLabel(`Novos Termos:`)
                        .setMaxLength(1800)
                        .setPlaceholder(`Insira o novos termos de compra ...`)
                        .setRequired(true)
                        .setStyle(`Paragraph`);

                    // rows for components
                    const iNewTerms = new ActionRowBuilder()
                        .addComponents(inputNewTerms);

                    // add the rows to the modal
                    await modal.addComponents(iNewTerms);

                    // open the modal
                    await iManage.showModal(modal);

                    // event - once - interactionCreate
                    client.once("interactionCreate", async (iModal) => {

                        // modalTerms - modal
                        if (iModal.customId == `modalTerms`) {

                            // deferUpdate - postphone the update
                            await iModal.deferUpdate();

                            // informations inserteds
                            const newTermsInserted = iModal.fields.getTextInputValue(`newTermsText`);

                            // set the information in dbConfigs (wio.db)
                            await dbConfigs.set(`termsPurchase`, newTermsInserted);

                            // message - terms - success
                            await iModal.followUp({
                                content: `✅ | Termos alterado para:\n${newTermsInserted}`,
                                ephemeral: true
                            });

                        };

                    });

                };

                // addBotLink - button
                if (iManage.customId == `addBotLink`) {

                    // deferUpdate - postphone the update
                    await iManage.deferUpdate();

                    // checks if the user who interacted is the owner of the bot
					const config = new JsonDatabase({ databasePath: "./config.json" });
                    const ownerId = await config.get(`owner`);
                    if (iManage.user.id != ownerId) {
                        await iManage.followUp({
                            content: `❌ | Apenas meu dono pode usar este botão.`,
                            ephemeral: true
                        });

                        return;
                    };

                    // invite - bot link
                    const inviteLink = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands&permissions=8`;

                    // row - bot link
                    const rowBotLink = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setLabel(`Adicionar BOT`).setEmoji(`🤖`).setStyle(`Link`).setURL(inviteLink)
                        );

                    // embed - bot link
                    const embedBotLink = new EmbedBuilder()
                        .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL() })
                        .setTitle(`${client.user.username} | Link do BOT`)
                        .setDescription(`Clique no botão abaixo para adicionar o BOT em um servidor.`)
                        .setColor(`NotQuiteBlack`);

                    // message - bot link
                    await iManage.followUp({
                        embeds: [embedBotLink],
                        components: [rowBotLink],
                        ephemeral: true
                    });

                };

            });

            // end of time - collector
            collectorConfig.on("end", async (c, r) => {
                if (r == "time") {

                    // message - edit
                    await msg.edit({
                        content: `⚙ | Use o comando novamente.`,
                        embeds: [],
                        components: []
                    }).catch(async (err) => {
                        return;
                    });

                };
            });

        });

    },
};