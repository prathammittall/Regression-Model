@echo off
setlocal

cd /d %~dp0

if not exist .venv\Scripts\python.exe (
    echo Creating local virtual environment...
    py -3 -m venv .venv
    if errorlevel 1 goto :error
)

call .venv\Scripts\activate.bat

echo Installing/updating dependencies...
python -m pip install --upgrade pip
if errorlevel 1 goto :error

python -m pip install -r requirements.txt
if errorlevel 1 goto :error

echo Running offline benchmark...
python -m backend.offline_cli %*
exit /b %errorlevel%

:error
echo Setup or execution failed.
exit /b 1
