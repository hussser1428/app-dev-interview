// Dùng chung code thuần + dữ liệu câu hỏi/thuật ngữ với web (../web/src), không copy.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../web/src")];

module.exports = config;
