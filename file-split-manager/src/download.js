const path = require("path");
const fs = require("fs");
const { fileDir } = require("./constants");
async function downloadFile(query, req, res) {
  try {
    const { filename, hash } = query;
    /** 是否断点续传 example: range: bytes=xxx-xxx */
    const range = req.headers["range"];
    const originName = decodeURIComponent(filename);
    const filePath = path.resolve(fileDir, hash);

    const stat = await fs.promises.stat(filePath);

    if (!range) {
      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
        "Content-Type": "application/octet-stream",
        "Content-Length": stat.size,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          originName
        )}"`,
        "Accept-Ranges": "bytes", // 表示支持断点续传（可选）
      });

      const readable = fs.createReadStream(filePath); // ✅ 流式传输
      readable.pipe(res);
    } else {
      const downloadRangeExactReg = /bytes=(\d*)-(\d*)/;
      const matchResult = downloadRangeExactReg.exec(range);
      const start = +(matchResult[1] || 0);
      const end = Math.min(+(matchResult[2] || stat.size - 1), stat.size - 1); // ✅ 确保不越界

      // checkRange
      if (end < start) {
        // err range
        res.writeHead(416, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
          "Content-Type": "text/plain",
          "Content-Range": `*/${stat.size}`,
        });

        res.end();
        return;
      }

      // range 正确
      const readable = fs.createReadStream(filePath, { start, end });

      /** 206 Partial Content */
      res.writeHead(206, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          originName
        )}"`,
        "Accept-Ranges": "bytes", // 表示支持断点续传（可选）
        "Content-Length": end - start + 1, //chunk 内容的大小
        "Content-Range": `bytes ${start}-${end}/${stat.size}`, // 注意 响应没有 “=”
      });

      readable.pipe(res);
    }
  } catch (err) {
    res.end()
    console.log(err);
  }
}

module.exports = {
  downloadFile,
};
