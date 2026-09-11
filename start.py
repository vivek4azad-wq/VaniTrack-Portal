#!/usr/bin/env python3
"""
Vani Portal Launcher
Starts the local web server and automatically opens the browser.
"""

import sys
import os
import webbrowser
import time
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / 'data' / 'vani_database.json'

def ensure_db():
    if not DB_FILE.exists():
        print("Database not found. Generating now...")
        subprocess.run([sys.executable, str(BASE_DIR / 'indexer.py')], check=True)

def main():
    ensure_db()
    port = 8080
    url = f"http://localhost:{port}"
    print("=" * 60)
    print("🚂 VANI TRACK & STORE MANAGEMENT PORTAL")
    print("   IMSD New Shambhu (SMUN) — Sanehwal (SNL) Section")
    print("=" * 60)
    print(f"Starting server at: {url}")
    print("Opening browser...")
    
    # Open browser in a separate thread or after slight delay
    def open_browser():
        time.sleep(1.2)
        webbrowser.open(url)

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    import uvicorn
    from server import app
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

if __name__ == '__main__':
    main()
