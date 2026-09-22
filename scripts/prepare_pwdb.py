#!/usr/bin/env python3
from pathlib import Path
import csv, io, json, urllib.request, zipfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data'/'pulse-real.json'
URL='https://zenodo.org/records/3339560/files/PWs_csv.zip?download=1'

print('Downloading PWDB baseline bundle...')
raw=urllib.request.urlopen(URL,timeout=60).read()
z=zipfile.ZipFile(io.BytesIO(raw))
csvs=[n for n in z.namelist() if n.lower().endswith('.csv')]
print('CSV files found:',len(csvs))
print('Inspect filenames and select the radial pressure waveform export before redistribution.')
OUT.write_text(json.dumps({'source':'PWDB baseline','source_url':URL,'archive_csv_files':csvs},indent=2))
print('Wrote archive inventory to',OUT)
