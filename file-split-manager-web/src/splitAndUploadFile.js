/** worker数量 */
showToast("💻 当前可用 CPU 核心数 " + navigator.hardwareConcurrency);
const HASH_WORKER_NUMBER = navigator.hardwareConcurrency;
const SAMPLING_WORKER = [
  0,
  Math.ceil((HASH_WORKER_NUMBER - 1) / 2),
  HASH_WORKER_NUMBER - 1,
];
const progress = document.querySelector("#upload-progress");

/** 切分并且上传文件 */
function splitAndUploadFile(e, chunkSize = 20 * 1024 * 1025) {
  const file = e.target.files?.[0];
  if (!file) return;

  _sliceFileAndHash(file, chunkSize);
}

/**
 * _splitFileAndHash 内部调用
 * @param {*} file  文件 Blob ｜ File
 * @param {*} chunkSize chunkSize 默认 20MB
 */
async function _sliceFileAndHash(file, chunkSize = 20 * 1024 * 1025) {
  if (!file instanceof Blob && !file instanceof File) {
    throw new Error("切分文件类型错误, 支持( Blob | File )");
  }
  const removeUploadToast = showToast(" 🔍 文件MD5抽样中...", -1);
  try {
    // 分片任务 promises
    const workResultPromises = [];
    /** 需要切分Chunk的数量 */
    let chunks_num = Math.ceil(file.size / chunkSize);
    /** 计算每个worker需要处理的chunks数量 */
    const worker_process_chunks_num = Math.ceil(
      chunks_num / HASH_WORKER_NUMBER
    );
    /** 分配worker 切分文件并且hash */
    for (let i = 0; i < chunks_num; i += worker_process_chunks_num) {
      const startChunk = i;
      const endChunk =
        i + worker_process_chunks_num > chunks_num
          ? chunks_num
          : i + worker_process_chunks_num;
      /** 分配Worker */
      workResultPromises.push(
        (async () => {
          return new Promise((resolve) => {
            /** 创建Worker */
            const worker = new Worker("/web-static/splitWorker.js");
            /** 设置回调 */
            worker.onmessage = (ev) => {
              resolve(ev.data);
            };
            /** 启动Worker */
            worker.postMessage({
              chunkSize,
              startChunk,
              endChunk,
              file,
              sampling: SAMPLING_WORKER.includes(i), // 仅抽样线程开启抽样hash 提高性能
            });
          });
        })()
      );
    }
    /** promise.all 处理所有结束 */
    const workResults = await Promise.all(workResultPromises);
    removeUploadToast();
    await _checkAndUpload(workResults, file.name);
  } catch (e) {
    console.log(e);
  }
}

async function _checkAndUpload(workResults, filename, resume = false) {
  const removeUploadToast = showToast("文件上传中🌍",-1);
  const chunksList = [];
  /** 创建 spark */
  const spark = new SparkMD5.ArrayBuffer();
  workResults.forEach((workResult) => {
    chunksList.push(...workResult);
    workResult.forEach((chunk) => {
      spark.append(chunk.hash);
    });
  });
  const fileHash = spark.end();
  const chunkList = chunksList.map((chunk) => chunk.index);

  const { isUploaded, requireChunks, uploadId } = await _checkExistFile(
    fileHash,
    chunkList,
    filename
  );
  removeUploadToast()
  if (isUploaded) {
    showToast(filename + "文件已经存在 📃");
  } else {
    if (!resume) {
      progress.setAttribute("value", 0);
    }
    const total = chunksList.length;
    let uploaded = 0;
    window.uploadController = new AbortController();
    window.uploadController.signal.addEventListener("abort", () => {
      window.retry = _checkAndUpload.bind(this, workResults, filename, true);
    });

    /** 需要分片上传 */
    await Promise.all(
      chunksList
        .filter((chunk) => {
          if (requireChunks[chunk.index]) {
            return true;
          } else {
            uploaded++;
            return false;
          }
        })
        .map((chunk) => {
          const formData = new FormData();
          formData.append("uploadId", uploadId);
          formData.append("index", chunk.index);
          formData.append("chunkContent", chunk.content);
          return fetch("/upload", {
            method: "POST",
            body: formData,
            signal: uploadController.signal,
          }).then((res) => {
            uploaded++;
            progress.setAttribute("value", (uploaded / total) * 100);
            return res.text();
          });
        })
    );

    await fetch("/upload/merge", {
      method: "POST",
      body: JSON.stringify({
        uploadId,
      }),
      headers: {
        "content-type": "application/json",
      },
    }).then((res) => res.text());
    window.updateTable();
    showToast("文件上传完成！✅");
    window.retry = ()=>{
      showToast("无可重试上传!");
    }
  }
}

/** 文件秒传处理 检查文件在不在 */
async function _checkExistFile(fileHash, chunkList, filename) {
  return await fetch("/upload/check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fileHash,
      chunkList,
      filename,
    }),
  })
    .then((res) => {
      return res.json();
    })
    .catch((err) => {
      throw err;
    });
}
