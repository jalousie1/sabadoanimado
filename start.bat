@echo off
setlocal

if exist node_modules (
    echo Modulos encontrados. Iniciando aplicacao...
    node src/index.js
) else (
    echo Modulos nao encontrados. Instalando dependencias...
    npm install
    echo Iniciando aplicacao...
    node src/index.js
)

endlocal
pause
