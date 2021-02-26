module.exports = {
    roots: ["<rootDir>/server", "<rootDir>/client", "<rootDir>/common"],
    transform: {
        "^.+\\.ts?$": "ts-jest",
    },
    testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$",
    moduleFileExtensions: ["ts", "js"],
    moduleDirectories: ["node_modules", "server", "client"],
    testEnvironment: "node",
};
