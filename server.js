require("dotenv").config();

const app = require("./src/app");

const PORT = process.env.PORT || 1903;

app.listen(PORT, () => {
    console.log("======================================");
    console.log("🚀 DreamStudio Backend V2 Started");
    console.log(`🌐 Port : ${PORT}`);
    console.log("======================================");
});
