@echo off
title Dota 2 Standalone Overlay (Electron)
cd /d "%~dp0"

echo ========================================================
echo    Dota 2 Standalone Overlay (Electron + GSI Server)
echo ========================================================
echo.
echo [ATALHOS GLOBAIS]
echo  - Ctrl + Shift + E : Alternar Modo Jogo (click-through) / Modo Edicao (mover widgets)
echo  - Ctrl + Shift + Q : Encerrar o overlay
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else (
        echo [ERRO] Node.js nao encontrado.
        pause
        exit /b
    )
)

if not exist "node_modules\electron" (
    echo [INFO] Instalando dependencias...
    call "C:\Program Files\nodejs\npm.cmd" install
)

echo [INFO] Iniciando Overlay...
call "C:\Program Files\nodejs\npm.cmd" start
