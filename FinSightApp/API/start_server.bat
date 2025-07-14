@echo off
echo Starting FinSight SMS Analysis API...
echo.

REM Check if virtual environment exists
if not exist "finsight_env" (
    echo Creating virtual environment...
    python -m venv finsight_env
)

REM Activate virtual environment
echo Activating virtual environment...
call finsight_env\Scripts\activate

REM Install requirements
echo Installing/updating requirements...
pip install -r requirements.txt

REM Start the FastAPI server
echo.
echo Starting API server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause