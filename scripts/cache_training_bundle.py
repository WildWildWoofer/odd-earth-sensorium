#!/usr/bin/env python3
from pathlib import Path
import re, urllib.request

ROOT=Path(__file__).resolve().parents[1]
manifest=(ROOT/'data'/'real-data.js').read_text()
urls=sorted(set(re.findall(r'"url":"([^"]+)"',manifest)))
out=ROOT/'assets'/'real'
out.mkdir(parents=True,exist_ok=True)

for url in urls:
    name=url.rsplit('/',1)[-1]
    dest=out/name
    if dest.exists():
        continue
    print('downloading',url)
    req=urllib.request.Request(url,headers={'User-Agent':'OddEarth-Sensorium/0.2'})
    with urllib.request.urlopen(req,timeout=90) as r:
        dest.write_bytes(r.read())

print('Cached',len(urls),'curated source files in',out)
print('Note: update data/real-data.js localUrl fields before production use.')
