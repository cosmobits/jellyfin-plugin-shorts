#!/usr/bin/env python3
"""Reject common secrets and machine-specific data without printing their values."""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKIP = {'.git', 'node_modules', 'dist', 'bin', 'obj', 'artifacts', '.env', '__pycache__', '.venv'}
RULES = {
    'current home path': re.escape(str(pathlib.Path.home())),
    'private key': r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'GitHub credential': r'\b(?:gh[opurs]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b',
    'cloud access key': r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
    'personal filesystem path': r'(?:/Users/[A-Za-z0-9_.-]+/(?:Documents|Desktop|Downloads|Library|Pictures|Movies|Music|\.ssh|\.codex)/|/home/[A-Za-z0-9_.-]+/|[A-Za-z]:\\Users\\[A-Za-z0-9_.-]+\\)',
    'private network address': r'\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b',
    'private hostname': r'https?://[A-Za-z0-9.-]+\.(?:home|lan|local)(?=[:/\s\'"<>]|$)',
    'credential in URL': r'https?://[^\s/@:]+:[^\s/@]+@',
    'credential value in URL': r'[?&](?:api_key|access_token|token)=[A-Za-z0-9_-]{16,}',
    'email address': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
}
# Reserved example domains, public GitHub bot identity, and dependency coordinates are not personal data.
PUBLIC_EMAIL = re.compile(r'(?:@(?:example\.(?:com|org|net)|example\.test|users\.noreply\.github\.com)$|^[0-9]+\+github-actions\[bot\]@users\.noreply\.github\.com$)')

def files():
    result = subprocess.run(['git','ls-files','-z'], cwd=ROOT, capture_output=True)
    if result.returncode == 0:
        return [ROOT / name for name in result.stdout.decode().split('\0') if name]
    return [p for p in ROOT.rglob('*') if p.is_file() and not any(part in SKIP for part in p.relative_to(ROOT).parts)]

def main():
    failures = []
    for path in files():
        relative = path.relative_to(ROOT)
        if any(part in SKIP for part in relative.parts):
            # Build/runtime output must never be tracked, even though fallback scans skip it.
            failures.append(f'{relative}: generated or runtime files must not be published')
            continue
        if path.name.startswith('.env') or path.suffix.lower() in {'.pfx','.p12','.pem','.key','.db','.sqlite','.log'}:
            failures.append(f'{relative}: private/runtime file type')
            continue
        try:
            content = path.read_text(encoding='utf-8')
        except (UnicodeError, OSError):
            failures.append(f'{relative}: unexpected binary or unreadable source file')
            continue
        for rule, pattern in RULES.items():
            for match in re.finditer(pattern, content, flags=re.IGNORECASE if rule not in {'GitHub credential','cloud access key'} else 0):
                if rule == 'email address' and PUBLIC_EMAIL.search(match.group()):
                    continue
                failures.append(f'{relative}: {rule}')
                break
    if failures:
        print('Public-source check failed (matched values are redacted):\n'+'\n'.join(failures),file=sys.stderr)
        return 1
    print('Public-source check passed: no recognized credentials, private addresses, personal paths or email addresses.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
