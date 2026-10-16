"""Read-only local readiness checks. Never write or print pairing credentials."""
import json
import sys
import time
import urllib.request
from pathlib import Path

config = json.loads(Path('/mnt/d/RicomatesBot/ricomates-pc.json').read_text())

def get(route):
    request = urllib.request.Request('http://127.0.0.1:18056' + route, headers={'X-API-Key': config['vexaApiKey']})
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.load(response)

if sys.argv[1] == 'ready':
    for attempt in range(18):
        try:
            value = get('/bots/ricomates/voice-capabilities')
            if value.get('version') == 1 and 'google_meet' in value.get('platforms', []):
                print('Authenticated Google Meet voice route is ready.')
                sys.exit(0)
        except Exception:
            pass
        time.sleep(5)
    raise SystemExit('Voice route did not become ready. No audible test has been completed.')
else:
    try:
        result = get('/bots?limit=100&offset=0')
        offset = 0
        while True:
            rows = result.get('meetings')
            if not isinstance(rows, list): raise ValueError('Unexpected list')
            if any(m.get('status') not in ('completed', 'failed') for m in rows):
                raise SystemExit('Finish all Vexa meetings before installing the voice extension.')
            if result.get('has_more') is not True: break
            if not rows or offset >= 100000: raise ValueError('Incomplete list')
            offset += len(rows)
            result = get('/bots?limit=100&offset=' + str(offset))
    except Exception:
        raise SystemExit('Cannot verify active meetings. Keep Vexa running, then retry. No services changed.')
    print('No unfinished meetings found.')
