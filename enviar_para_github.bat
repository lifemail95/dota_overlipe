@echo off
title Enviar Overlay para o GitHub
cd /d "%~dp0"

echo ========================================================
echo       Publicar / Atualizar Overlay no GitHub
echo ========================================================
echo.

set "GIT_CMD=C:\Users\felip\AppData\Local\Programs\MinGit\cmd\git.exe"
if not exist "%GIT_CMD%" (
    set "GIT_CMD=git"
)

"%GIT_CMD%" remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo [PASSO 1] Voce ainda nao vinculou o link do seu repositorio GitHub.
    echo.
    echo Exemplo de link: https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
    echo.
    set /p REPO_URL="Cole o link do seu repositorio do GitHub e aperte Enter: "
    if not defined REPO_URL (
        echo [ERRO] Nenhum link informado. Encerrando...
        pause
        exit /b
    )
    "%GIT_CMD%" remote add origin "%REPO_URL%"
    echo [SUCESSO] Repositorio remoto vinculado!
)

echo.
echo [PASSO 2] Enviando arquivos para a branch main...
"%GIT_CMD%" add .
"%GIT_CMD%" commit -m "update: atualizacoes no overlay tatico" >nul 2>nul
"%GIT_CMD%" push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  [SUCESSO] Projeto hospedado no GitHub com sucesso!
    echo ========================================================
) else (
    echo.
    echo [INFO] Se foi solicitada autenticacao, faca o login na janela do navegador.
)

pause
