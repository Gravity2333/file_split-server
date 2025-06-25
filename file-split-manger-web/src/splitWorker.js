importScripts("./spark-md5.js"); // 以worker文件为base路径

/** 对chunk进行hash */
async function _hanleChunkHash(chunkBlob) {
  return new Promise((resolve) => {
    /** 创建 spark */
    const spark = new SparkMD5.ArrayBuffer();
    /** 创建文件阅读器 fileReader */
    const reader = new FileReader();
    reader.onload = () => {
      const chunkContent = reader.result;
      spark.append(chunkContent);
      resolve(spark.end());
    };
    reader.readAsArrayBuffer(chunkBlob);
  });
}

self.onmessage = (e) => {
  const { startChunk, endChunk, chunkSize, file, sampling } = e.data;
  const chunksPromise = [];

  for (let i = startChunk; i < endChunk; i++) {
    /** 处理第 i 个 块 */
    chunksPromise.push(
      (async () => {
        const chunkBlob = file.slice(i * chunkSize, (i + 1) * chunkSize);
        const chunk = {
          content: chunkBlob,
          hash: sampling ? await _hanleChunkHash(chunkBlob) : "",
          index: i,
        };
        return chunk;
      })()
    );
  }

  Promise.all(chunksPromise)
    .then((chunksContent) => {
      /** 返回结果给主线程 */
      self.postMessage(chunksContent);
    })
    .catch(() => {
      self.postMessage([]);
    });
};
