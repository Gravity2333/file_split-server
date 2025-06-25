const path = require("path");
const fs = require("fs");

async function renderPage(req, res) {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
      "Content-Type": "text/html",
    });
    const readableStream = fs.createReadStream(
      path.resolve(__dirname, "../../file-split-manager-web/index.html")
    );
    readableStream.pipe(res);
  }
  
  async function renderStatic(req, res) {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
      "Content-Type": "text/javascript",
    });
    const readableStream = fs.createReadStream(
      path.resolve(
        __dirname,
        "../../file-split-manager-web/src" + req.url.slice("/web-static".length)
      )
    );
    readableStream.pipe(res);
  }

module.exports = {
    renderStatic,renderPage
}