@echo off
title Serwer Monitora Laptopow
echo Uruchamiam serwer bazy danych...
start "" "http://localhost:8000"
python server.py
pause