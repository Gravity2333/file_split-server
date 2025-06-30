const streamWriterMap = new Map(); // 以文件名为 key 复用 writer

/** 切片下载文件 */
async function download(name, hash, id, loaded = 0) {
  try {
    const progress = document.getElementById("progress_" + id);
    const pause = document.getElementById("pause_" + id);
    const resume = document.getElementById("resume_" + id);

    const controller = new AbortController();
    const headers = loaded > 0 ? { Range: `bytes=${loaded}-` } : {};

    const response = await fetch(
      `/download?hash=${encodeURIComponent(hash)}&filename=${encodeURIComponent(
        name
      )}`,
      { method: "GET", headers, signal: controller.signal }
    );

    const contentRange = response.headers.get("content-range");
    let totalSize = 0;
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) totalSize = parseInt(match[1], 10);
    } else {
      totalSize = parseInt(response.headers.get("content-length"), 10) || 0;
    }

    let writer = streamWriterMap.get(name);
    if (!writer) {
      const writeStream = streamSaver.createWriteStream(name, {
        size: totalSize,
      });
      writer = writeStream.getWriter();
      streamWriterMap.set(name, writer);
    }

    const streamReader = response.body.getReader();
    let currentLoaded = loaded;

    function _handleResume() {
      download(name, hash, id, currentLoaded);
      pause.removeEventListener("click", _handlePause);
      resume.removeEventListener("click", _handleResume);
    }

    function _handlePause() {
      controller.abort();
      pause.removeEventListener("click", _handlePause);
      resume.addEventListener("click", _handleResume);
    }

    pause.addEventListener("click", _handlePause);

    while (true) {
      const { done, value } = await streamReader.read();
      currentLoaded += value?.length || 0;
      if (done) {
        console.log("write end");
        writer.close();
        streamWriterMap.delete(name);
        console.log(streamWriterMap);
        break;
      }
      await writer.write(value);
      progress?.setAttribute("value", (currentLoaded / totalSize) * 100);
    }
  } catch (e) {
    console.error("download err", e);
  }
}
