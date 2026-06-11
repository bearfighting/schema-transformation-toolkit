import { cac } from "cac";

const cli = cac("aio-converter");

cli.command("info", "Show workspace status").action(() => {
  console.log("type-schema-converter");
});

cli.help();
cli.parse();
