// slashCommandBuilder
const { SlashCommandBuilder } = require("@discordjs/builders");

// moment - locale
const moment = require("moment");

// wio.db - databases
const { JsonDatabase } = require("wio.db");
const dbCoupons = new JsonDatabase({ databasePath: "./databases/dbCoupons.json" });
const dbPerms = new JsonDatabase({ databasePath: "./databases/dbPermissions.json" });

// export command
module.exports = {
    data: new SlashCommandBuilder()
        .setName("criar-cupom")
        .setDescription("[🛠/💰] Cadastre um novo cupom de desconto!")
        .addStringOption(opString => opString
            .setName("nome")
            .setDescription("Nome do Cupom")
            .setMaxLength(25)
            .setRequired(true)
        )
        .addIntegerOption(opInteger => opInteger
            .setName("porcentagem")
            .setDescription("Porcentagem do Desconto (Ex: 50%)")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
        .addIntegerOption(opInteger => opInteger
            .setName("quantidade")
            .setDescription("Quantidade de usos do Cupom (Ex: 25)")
            .setMinValue(1)
            .setMaxValue(10000)
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

        // variables get options
        const nameCoupon = interaction.options.getString("nome").replace(/\s/g, "").toLowerCase();
        const percentageCoupon = interaction.options.getInteger("porcentagem");
        const quantityCoupon = interaction.options.getInteger("quantidade");

        // inserted coupon was found in dbCoupons (wio.db)
        if (dbCoupons.has(nameCoupon)) {
            await interaction.reply({
                content: `❌ | ID do cupom: **${idCoupon}** já existe.`,
                ephemeral: true
            });
            return;
        };

        // arrow the coupon at dbCoupons (wio.db)
        await dbCoupons.set(`${nameCoupon}.name`, nameCoupon);
        await dbCoupons.set(`${nameCoupon}.discount`, percentageCoupon);
        await dbCoupons.set(`${nameCoupon}.stock`, quantityCoupon);
        await dbCoupons.set(`${nameCoupon}.role`, `none`);
        await dbCoupons.set(`${nameCoupon}.minimumPurchase`, 0);

        // reply - success
        await interaction.reply({
            content: `✅ | Cupom de desconto criado com sucesso. Use **/config-cupom** para gerenciar seu cupom!`,
            ephemeral: true
        });

    },
};