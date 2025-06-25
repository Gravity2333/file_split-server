const querystring = require("querystring");

async function getRequestBody(req) {
  const contentType = req.headers["content-type"] || "";
  const isJson = contentType.includes("application/json");
  const isUrlEncoded = contentType.includes("application/x-www-form-urlencoded");
  const isFormData = contentType.includes("multipart/form-data");

  return new Promise((resolve, reject) => {
    let bodyChunks = [];
    req.on("data", (chunk) => {
      bodyChunks.push(chunk);
    });

    req.on("end", () => {
      const bodyBuffer = Buffer.concat(bodyChunks);

      if (isJson) {
        try {
          const json = JSON.parse(bodyBuffer.toString("utf8"));
          return resolve(json);
        } catch (e) {
          return resolve({});
        }
      }

      if (isUrlEncoded) {
        const result = querystring.parse(bodyBuffer.toString("utf8"));
        return resolve(result);
      }

      if (isFormData) {
        const boundaryMatch = contentType.match(/boundary="?(.+?)"?$/);
        if (!boundaryMatch) return resolve({});

        const boundary = boundaryMatch[1];
        const parts = bodyBuffer.toString('latin1').split(`--${boundary}`);

        const result = {};

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed || trimmed === "--") continue;

          const splitIndex = trimmed.indexOf('\r\n\r\n');
          if (splitIndex === -1) continue;

          const rawHeaders = trimmed.slice(0, splitIndex);
          const rawContent = trimmed.slice(splitIndex + 4);

          const nameMatch = rawHeaders.match(/name="([^"]+)"/);
          if (!nameMatch) continue;

          const name = nameMatch[1];
          const filenameMatch = rawHeaders.match(/filename="([^"]*)"/);

          if (filenameMatch && filenameMatch[1]) {
            // 保留完整二进制
            const contentBuffer = Buffer.from(rawContent, 'latin1');
            result[name] = contentBuffer;
          } else {
            const value = rawContent.trim();
            result[name] = value;
          }
        }

        return resolve(result);
      }

      // 其他直接返回字符串
      return resolve(bodyBuffer.toString("utf8"));
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

module.exports = { getRequestBody };
