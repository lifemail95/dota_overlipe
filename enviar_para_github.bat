@echo off
title Enviar Overlay para https://github.com/lifemail95/dota_overlipe
cd /d "%~dp0"

echo ========================================================
echo       Publicar Overlay em lifemail95/dota_overlipe
echo ========================================================
echo.

set "GIT_CMD=C:\Users\felip\AppData\Local\Programs\MinGit\cmd\git.exe"
set "GH_CMD=C:\Users\felip\AppData\Local\Programs\gh\gh.exe"

"%GIT_CMD%" remote set-url origin "https://github.com/lifemail95/dota_overlipe.git" 2>nul
if %errorlevel% neq 0 (
    "%GIT_CMD%" remote add origin "https://github.com/lifemail95/dota_overlipe.git" 2>nul
)

echo [1/3] Verificando autenticacao com o GitHub...
"%GH_CMD%" auth status >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ATENCAO] O GitHub precisa da sua autorizacao no navegador.
    echo Uma aba no navegador sera aberta com um codigo de confirmacao.
    echo.
    "%GH_CMD%" auth login --web -h github.com -p https
    "%GH_CMD%" auth setup-git
) else (
    "%GH_CMD%" auth setup-git
)

echo.
echo [2/3] Preparando arquivos e commit...
"%GIT_CMD%" branch -M main
"%GIT_CMD%" add .
"%GIT_CMD%" commit -m "feat: overlay tatico dota 2 com electron, gsi e opendota" >nul 2>nul

echo.
echo [3/3] Enviando para https://github.com/lifemail95/dota_overlipe...
"%GIT_CMD%" push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [SUCESSO] Projeto publicado com sucesso no seu GitHub!
    echo  Acesse em: https://github.com/lifemail95/dota_overlipe
    echo ========================================================
) else (
    echo.
    echo [ERRO] Ocorreu uma falha no envio. Verifique a conexao e tente novamente.
)

pause
