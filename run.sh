#!/bin/sh

# 绝对路径
BASE_DIR="$(cd "$(dirname "$0")"; pwd)"
SERVER_FILE="$BASE_DIR/file-split-manager/src/server.js"
PORT=10087

# 杀掉占用端口的进程
echo "检查并杀掉占用端口 $PORT 的进程..."
PID=$(lsof -ti tcp:$PORT)
if [ -n "$PID" ]; then
  echo "发现进程 $PID，正在终止..."
  kill -9 "$PID"
else
  echo "端口 $PORT 没有被占用"
fi

# 检查文件是否存在
if [ ! -f "$SERVER_FILE" ]; then
  echo "未找到 server.js: $SERVER_FILE"
  exit 1
fi

# 启动 Node 服务（后台）
echo "启动 Node 服务: $SERVER_FILE"
node "$SERVER_FILE" &

# 等待几秒让服务启动
sleep 3

# 打开浏览器访问 http://127.0.0.1:10087
echo "正在打开浏览器访问 http://127.0.0.1:$PORT ..."
case "$(uname)" in
  Darwin)
    open "http://127.0.0.1:$PORT"  # MacOS
    ;;
  Linux)
    xdg-open "http://127.0.0.1:$PORT"  # Linux
    ;;
  CYGWIN*|MINGW*|MSYS*)
    start "http://127.0.0.1:$PORT"  # Windows Git Bash
    ;;
  *)
    echo "不支持的操作系统: $(uname)"
    exit 2
    ;;
esac

# 这里如果你想让脚本不退出，可以等待 Node 服务进程
wait
