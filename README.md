# 文件切片上传系统 Demo

## 项目简介
一个完整的文件切片上传解决方案演示，包含秒传、断点续传等高级功能，适合学习原理和二次开发。

## 核心功能
✅ **大文件切片上传** - 将大文件分割为小块并行上传  
✅ **断点续传** - 网络中断后可恢复未完成的上传  
✅ **秒传功能** - 通过文件指纹识别已存在的文件  
✅ **进度显示** - 实时显示上传进度和状态  
✅ **跨平台支持** - 提供多种部署方式  

## 技术架构
### 前端技术
- HTML5 File API
- JavaScript Blob 切片处理
- Axios 网络请求
- 进度条可视化

### 后端技术
- Node.js + Express
- 文件哈希校验
- 分片存储管理
- 断点续传逻辑

## 目录结构

- `src/server.js` - Node.js 后端服务代码  
- `file-split-manager-web/index.html` - 前端示例页面

---

## 运行方式

在项目根目录下运行以下命令启动服务：


```sh
npm run start         # 本地运行服务（调用 run.sh）
npm run start:docker  # 构建 amd64 镜像
npm run start:docker-arm  # 构建指定平台镜像（amd64）
npm run start:compose # 运行容器，映射端口 10087

```


##  docker 构建 
```sh
docker buildx build --platform linux/amd64 -t file-split-system:latest .

docker build -t file-split-system .

docker run -d \
  --restart unless-stopped \
  -p 10087:10087 \
  --name file-split-system \
  file-split-system

```

##  sh
```sh
sh run.sh
```
# file_split-server
