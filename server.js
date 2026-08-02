require("dotenv").config();

const app = require("./src/app");
const logger = require("./src/utils/logger.util");

const PORT = process.env.PORT || 1903;

app.listen(PORT, () => {
    logger.info("======================================");
    logger.info("🚀 DreamStudio Backend V2 Started");
    logger.info(`🌐 Port : ${PORT}`);
    logger.info("======================================");
});
