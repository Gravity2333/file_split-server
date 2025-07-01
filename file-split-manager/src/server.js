const path = require("path");
const http = require("http");
const fs = require("fs");
const { getRequestBody } = require("./getRequestBody");
const { fileDir } = require("./constants");
const { parse: parseUrl } = require("url");
const { renderStatic, renderPage } = require("./static");
const { downloadFile } = require("./download");
const { generateFileName, decodeFileName } = require("./encrypt");

function deleteFolderRecursive(dirPath) {
  const fsSync = require("fs");
  if (fsSync.existsSync(dirPath)) {
    fsSync.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fsSync.lstatSync(curPath).isDirectory()) {
        // 递归删除子目录
        deleteFolderRecursive(curPath);
      } else {
        // 删除文件
        fsSync.unlinkSync(curPath);
      }
    });
    fsSync.rmdirSync(dirPath);
  } else {
  }
}

async function handleCheckFile(req, res) {
  // check
  const body = await getRequestBody(req);
  const encodedFilename = generateFileName(body.fileHash, body.filename);

  const isUploaded = fs.existsSync(
    path.resolve(fileDir, encodedFilename + ".file")
  );

  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
    "Content-Type": "application/json",
  });

  /** 没上传过 */
  if (!isUploaded) {
    // 已经合并一些
    const requireChunks =
      body?.chunkList
        ?.filter((chunkName) => {
          return !fs.existsSync(
            path.resolve(fileDir, encodedFilename, chunkName + ".tempFile")
          );
        })
        .reduce((memo, chunkName) => {
          memo[chunkName] = true;
          return memo;
        }, {}) || {};

    res.write(
      JSON.stringify({
        isUploaded: false,
        requireChunks,
        uploadId: encodedFilename,
      })
    );

    res.end();
  } else {
    res.write(
      JSON.stringify({
        isUploaded: true,
        requireChunks: {},
      })
    );
    res.end();
  }
}

async function handleUploadFile(req, res) {
  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
    "Content-Type": "text/plain",
  });
  try {
    const body = await getRequestBody(req);
    const tmpFileDir = path.resolve(fileDir, body.uploadId);
    await fs.promises.mkdir(tmpFileDir, { recursive: true });
    await fs.promises.writeFile(
      path.resolve(tmpFileDir, `${body.index}.tempFile`),
      body.chunkContent
    );
    res.write("ok");
    res.end();
  } catch (err) {
    console.log(err);
    res.end();
  }
}

async function mergeChunkFiles(req, res) {
  try {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
      "Content-Type": "text/plain",
    });
    const { uploadId } = await getRequestBody(req);
    const tmpFireDirPath = path.resolve(fileDir, uploadId);
    const tmpFileList = await fs.promises.readdir(tmpFireDirPath);
    const { filename, hash } = decodeFileName(uploadId);
    const completeFPath = path.resolve(
      fileDir,
      decodeURIComponent(uploadId) + ".file"
    );
    let size = 0;
    for (let i = 0; i < tmpFileList.length; i++) {
      const tmpFileName = `${i}.tempFile`;
      const tmpFilePath = path.resolve(tmpFireDirPath, tmpFileName);
      const buffer = await fs.promises.readFile(tmpFilePath);
      await fs.promises.appendFile(completeFPath, buffer);
      size += buffer.length;
    }
    const descPath = path.resolve(fileDir, uploadId + ".desc");
    await fs.promises.appendFile(
      descPath,
      JSON.stringify({
        filename,
        hash: decodeURIComponent(uploadId) + ".file",
        size,
        birthtime: new Date(),
      })
    );
    // del tmp file
    await deleteFolderRecursive(tmpFireDirPath);
    res.write("ok");
    res.end();
  } catch (err) {
    console.log(err);
  }
}

async function listAllFiles(req, res) {
  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
    "Content-Type": "application/json",
  });
  // 确保目录存在，不存在则创建（递归创建）
  await fs.promises.mkdir(fileDir, { recursive: true });

  // 读取目录下所有文件名
  const files = await fs.promises.readdir(fileDir);
  // 用 Promise.all 并行读取所有文件信息
  const filesInfo = await Promise.all(
    files
      .filter((f) => f.endsWith(".desc"))
      .map(async (descFileName) => {
        const { filename, hash, size, birthtime } = JSON.parse(
          fs.readFileSync(path.resolve(fileDir, descFileName), "utf-8") || "{}"
        );
        return {
          name: filename,
          size: size, // 文件大小（字节）
          hash,
          isFile: true,
          birthtime: birthtime, // 创建时间
        };
      })
  );
  res.write(JSON.stringify(filesInfo));
  res.end();
}

async function deleteFile(query, req, res) {
  const { hash } = query;
  const filePath = path.resolve(fileDir, hash);
  await fs.promises.unlink(filePath);
  await fs.promises.unlink(filePath?.replace(".file", ".desc"));
  res.end()
}

const server = http.createServer(async (req, res) => {
  try {
    /** 处理CORS */
    const Origin = req.headers["origin"];

    if (req.method == "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": Origin,
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      });
      res.end();
      return;
    }

    const url = req.url;
    if (url?.startsWith("/upload/check")) {
      return await handleCheckFile(req, res);
    } else if (url?.startsWith("/upload/merge")) {
      return await mergeChunkFiles(req, res);
    } else if (url?.startsWith("/upload/list")) {
      return await listAllFiles(req, res);
    } else if (url?.startsWith("/delete")) {
      const parsedUrl = parseUrl(url, true);
      const query = parsedUrl.query;
      return await deleteFile(query, req, res);
    } else if (url?.startsWith("/download")) {
      const parsedUrl = parseUrl(url, true);
      const query = parsedUrl.query;
      return await downloadFile(query, req, res);
    } else if (url?.startsWith("/upload")) {
      return await handleUploadFile(req, res);
    } else if (url?.startsWith("/web-static")) {
      return await renderStatic(req, res);
    } else {
      return await renderPage(req, res);
    }
  } catch (err) {
    console.log(err);
    res.end(err);
  }
});

server.listen(10087, "0.0.0.0", () => {
  console.log("文件服务器启动，监听端口 10087");
});
