#!/usr/bin/env python3
"""Provision the bounded judge gateway. Credentials are read from environment only."""
import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--hostname', required=True)
parser.add_argument('--zone', required=True)
parser.add_argument('--origin', default='http://127.0.0.1:3117')
parser.add_argument('--private-dir', default='.proofgate/deployment')
args = parser.parse_args()
if not args.hostname.endswith('.' + args.zone):
    raise SystemExit('Hostname must be a subdomain of the selected zone.')
if args.origin != 'http://127.0.0.1:3117':
    raise SystemExit('Only the dedicated loopback judge gateway may be exposed.')
account = os.environ['CLOUDFLARE_ACCOUNT_ID']
token = os.environ['CLOUDFLARE_API_TOKEN']
headers = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
base = 'https://api.cloudflare.com/client/v4'

def api(path, method='GET', body=None):
    request = urllib.request.Request(base + path, method=method, headers=headers,
                                    data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            value = json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f'Cloudflare rejected {method} request with HTTP {error.code}; no credentials logged.')
    if not value.get('success'):
        raise SystemExit('Cloudflare operation failed: ' + ','.join(str(e.get('code')) for e in value.get('errors', [])))
    return value['result']

zones = api('/zones?' + urllib.parse.urlencode({'name': args.zone, 'status': 'active'}))
zones = [z for z in zones if z['account']['id'] == account]
if len(zones) != 1:
    raise SystemExit('An active zone in the selected account is required; no nameserver changes made.')
zone = zones[0]['id']
records = api(f'/zones/{zone}/dns_records?' + urllib.parse.urlencode({'name': args.hostname}))
name = 'proofgate-judges'
tunnels = api(f'/accounts/{account}/cfd_tunnel?is_deleted=false')
matching = [t for t in tunnels if t['name'] == name]
if len(matching) > 1:
    raise SystemExit('Multiple matching tunnels; reconcile before changing DNS.')
if records and (not matching or any(r['type'] != 'CNAME' or
        r['content'] != matching[0]['id'] + '.cfargotunnel.com' for r in records)):
    raise SystemExit('Existing hostname belongs to another destination; preserved.')
tunnel = matching[0] if matching else api(f'/accounts/{account}/cfd_tunnel', 'POST',
                                         {'name': name, 'config_src': 'cloudflare'})
if tunnel['config_src'] != 'cloudflare':
    raise SystemExit('Existing tunnel is not remotely managed; preserved.')
tid = tunnel['id']
private = Path(args.private_dir)
private.mkdir(parents=True, exist_ok=True)
private.chmod(0o700)
receipt = {'hostname': args.hostname, 'zoneId': zone, 'tunnelId': tid,
           'origin': args.origin, 'dnsRecordId': None, 'name': name}
(private / 'cloudflare.json').write_text(json.dumps(receipt, indent=2) + '\n')
(private / 'cloudflare.json').chmod(0o600)
api(f'/accounts/{account}/cfd_tunnel/{tid}/configurations', 'PUT', {'config': {'ingress': [
    {'hostname': args.hostname, 'service': args.origin}, {'service': 'http_status:404'}]}})
tunnel_token = api(f'/accounts/{account}/cfd_tunnel/{tid}/token')
if not isinstance(tunnel_token, str) or not tunnel_token:
    raise SystemExit('Tunnel token unavailable; not logged.')
secret_path = private / 'tunnel-token'
fd = os.open(secret_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as stream:
    stream.write(tunnel_token)
secret_path.chmod(0o600)
record = records[0] if records else api(f'/zones/{zone}/dns_records', 'POST', {
    'type': 'CNAME', 'name': args.hostname, 'content': tid + '.cfargotunnel.com',
    'proxied': True, 'ttl': 1})
if not record['proxied']:
    raise SystemExit('Existing record is not proxied; preserved. Enable proxy explicitly before delivery.')
receipt['dnsRecordId'] = record['id']
(private / 'cloudflare.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'hostname': args.hostname, 'tunnelId': tid, 'dnsRecordId': record['id'],
                  'configured': True, 'connectorRunning': False, 'secrets': 'private files only'}))
