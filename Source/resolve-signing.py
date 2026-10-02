"""Find a usable local Apple signing identity without printing its owner name."""
import hashlib
import os
import re
import ssl
import subprocess
import sys

listing = subprocess.check_output(['security', 'find-identity', '-v', '-p', 'codesigning'], text=True)
identities = []
for line in listing.splitlines():
    match = re.search(r'\) ([A-F0-9]{40}) "([^"]+)"', line)
    if match and 'CSSMERR' not in line and any(kind in match[2] for kind in ['Developer ID Application', 'Apple Development']):
        identities.append((match[1], 'Developer ID Application' in match[2]))
requested = os.environ.get('HALO_SIGN_IDENTITY')
if requested:
    identities = [item for item in identities if item[0] == requested.upper()]
if not identities:
    sys.exit('Safari updates require an Apple Development or Developer ID Application certificate. Ad-hoc signing cannot load Sparkle with library validation enabled.')
identity = sorted(identities, key=lambda item: item[1], reverse=True)[0][0]
certificates = subprocess.check_output(['security', 'find-certificate', '-a', '-p'], text=True)
for pem in re.findall(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', certificates, flags=re.S):
    if hashlib.sha1(ssl.PEM_cert_to_DER_cert(pem)).hexdigest().upper() != identity:
        continue
    subject = subprocess.check_output(['openssl', 'x509', '-noout', '-subject', '-nameopt', 'RFC2253'], input=pem, text=True)
    team = re.search(r'(?:^|,)OU=([A-Z0-9]{10})(?:,|$)', subject)
    if team:
        print(identity, team[1])
        break
else:
    sys.exit('The signing certificate team identifier could not be resolved.')
