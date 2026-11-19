@echo off
title Dota 2 Standalone Overlay (Electron)
cd /d "%~dp0"

echo ========================================================
echo    Dota 2 Standalone Overlay (Electron)
echo ========================================================
echo.
echo [ATALHOS IMPORTANTES]
echo  - Ctrl + Shift + E : Alternar entre Modo Jogo (cliques atravessam) e Modo Edicao (mover/clicar)
echo  - Ctrl + Shift + Q : Fechar o overlay
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
    echo [INFO] Instalando dependencias do Electron...
    call "C:\Program Files\nodejs\npm.cmd" install
)

echo [INFO] Iniciando Overlay Electron e servidor GSI...
echo.
call "C:\Program Files\nodejs\npm.cmd" start
pause
