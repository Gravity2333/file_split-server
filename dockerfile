FROM node:18

WORKDIR /app

# 复制根目录所有内容到容器的 /app
COPY . .

# 如果有 package.json 可以安装依赖，否则可以删除下面行
# RUN npm install

# 赋予 run.sh 执行权限（如果有需要）
RUN chmod +x run.sh || true

# 启动 server.js （注意路径）
CMD ["node", "file-split-manager/src/server.js"]

# 根据 server.js 监听端口修改
EXPOSE 10087
