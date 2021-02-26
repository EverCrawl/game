
//@ts-ignore |SAFETY| snowpack provides this
let env = import.meta.env
//@ts-ignore |SAFETY| no other property named `DEBUG` should exist globally
window.DEBUG = (env.MODE === "development");

export { }