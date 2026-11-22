@echo off
:: Run this once as Administrator to allow phone access on the same Wi-Fi
netsh advfirewall firewall delete rule name="Foodporium Vite 5173" >nul 2>&1
netsh advfirewall firewall add rule name="Foodporium Vite 5173" dir=in action=allow protocol=TCP localport=5173 profile=any
echo.
echo Firewall opened for port 5173.
echo On your phone (same Wi-Fi), open:
echo   http://10.242.110.158:5173/
echo.
pause
