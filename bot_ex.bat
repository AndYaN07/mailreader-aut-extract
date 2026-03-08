@echo off
:: Ir a la carpeta del proyecto
cd /d "C:\Users\Anderson\Desktop\andy\docsAndy\pruebasPropias\extractorDeCodigo"

:: Ejecutar node usando la ruta absoluta
node src/app.js 2> errores_criticos.txt

:: Opcional: Si se quiere ver errores mientras se hacen pruebas, descomentar la siguiente linea:
:: pause