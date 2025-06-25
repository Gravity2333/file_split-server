function generateFileName(hash, filename) {
  const info = {
    hash,
    filename,
  };
  return Buffer.from(JSON.stringify(info)).toString("base64");
}

function decodeFileName(encodedStr) {
  const jsonStr = Buffer.from(encodedStr, "base64").toString("utf8");
  return JSON.parse(jsonStr);
}

function encodeBase64(info){
  return Buffer.from(JSON.stringify(info)).toString("base64");
}

function decodeBase64(info){
  const jsonStr = Buffer.from(info, "base64").toString("utf8");
  return JSON.parse(jsonStr);
}

module.exports = {
  generateFileName,
  decodeFileName,
  encodeBase64,
  decodeBase64
};
