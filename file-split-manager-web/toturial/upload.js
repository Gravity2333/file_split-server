const file = new File([], "test");
const chunkSize = 5 * 1024 * 1024;
const chunks = [];
const spark = new SparkMD5.ArrayBuffer();

async function _sliceAndHashChunks(chunkStart, chunkEnd, file) {
  return new Promise((resolve) => {
    const slicedFile = file.slice(chunkStart, chunkEnd);
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const _chunkContent = fileReader.result;
      /** 处理hash */
      spark.append(_chunkContent);
      /** push chunks */
      chunks.push({
        content: slicedFile,
        index: Math.floor(chunkStart / chunkSize),
      });
      resolve();
    };
    fileReader.readAsArrayBuffer(slicedFile);
  });
}

(async () => {
  for (let chunkStart = 0; chunkStart < file.size; chunkStart += chunkSize) {
    await _sliceAndHashChunks(chunkStart, chunkStart + chunkSize, file);
  }

  console.log("生成文件的Hash", spark.end());
})();
