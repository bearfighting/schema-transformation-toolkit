import { cac } from "cac";

const cli = cac("aio-converter");

cli.command("info", "Show workspace status").action(() => {
  console.log("all-in-one-data-type-converter");
});

cli.help();
cli.parse();
