@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动 HealthLens 开发服务器...
echo 浏览器访问: http://localhost:3000
echo 关闭此窗口即可停止服务器
echo ----------------------------------------
npm run dev
