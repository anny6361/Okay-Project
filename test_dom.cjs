const jsdom = require("jsdom");
const { JSDOM } = jsdom;

JSDOM.fromURL("http://localhost:3000", {
  runScripts: "dangerously",
  resources: "usable"
}).then(dom => {
  dom.window.console.error = (...args) => {
    console.log("ERROR:", ...args);
  };
  dom.window.console.warn = (...args) => {};
  dom.window.console.log = (...args) => {};
  dom.window.addEventListener('error', (event) => {
    console.log("ERROR EVENT:", event.message);
  });
  dom.window.addEventListener('unhandledrejection', (event) => {
    console.log("UNHANDLED:", event.reason);
  });
  setTimeout(() => {
    console.log("Done waiting");
    process.exit(0);
  }, 10000);
}).catch(e => {
  console.log("Failed", e);
});
