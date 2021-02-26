import dotenv from "dotenv";
dotenv.config();

const isDebug = process.env.MODE === "development";

//@ts-ignore |SAFETY| no other property named `DEBUG` should exist globally
globalThis.DEBUG = isDebug;
//@ts-ignore |SAFETY| no other property named `DEBUG` should exist globally
global.DEBUG = isDebug;