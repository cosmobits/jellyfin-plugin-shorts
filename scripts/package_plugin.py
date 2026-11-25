#!/usr/bin/env python3
"""Package only public runtime assets and generate Jellyfin's repository catalog."""
import argparse
import hashlib
import json
import pathlib
import re
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
GUID = 'c7c09a75-f1ae-42b5-afd2-6b770ab7301a'
REPOSITORY = 'cosmobits/jellyfin-plugin-shorts'

def version():
    return ET.parse(ROOT/'plugin/Jellyfin.Plugin.Shorts/Jellyfin.Plugin.Shorts.csproj').findtext('.//Version')

def merge_catalog(existing, incoming):
    if not isinstance(existing,list) or not isinstance(incoming,list):
        raise ValueError('Catalog must be an array')
    result = list(existing)
    for plugin in incoming:
        previous = next((p for p in result if p['guid']==plugin['guid']),None)
        versions = {(v['version'],v['targetAbi']):v for v in (previous or {}).get('versions',[])}
        versions.update({(v['version'],v['targetAbi']):v for v in plugin['versions']})
        updated = {**plugin,'versions':sorted(versions.values(),key=lambda v:tuple(int(n) for n in v['version'].split('.')),reverse=True)}
        result = [p for p in result if p['guid']!=plugin['guid']] + [updated]
    return result

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--expected-tag')
    parser.add_argument('--merge',type=pathlib.Path)
    args=parser.parse_args()
    if args.merge:
        catalog=ROOT/'manifest.json'
        existing=json.loads(catalog.read_text()) if catalog.exists() else []
        catalog.write_text(json.dumps(merge_catalog(existing,json.loads(args.merge.read_text())),indent=2)+'\n')
        return
    release_version=version()
    if not re.fullmatch(r'\d+\.\d+\.\d+\.\d+',release_version or ''):
        raise SystemExit('Plugin version must contain four numeric components')
    tag=args.expected_tag or 'v'+'.'.join(release_version.split('.')[:3])
    if not re.fullmatch(r'v\d+\.\d+\.\d+(?:\.\d+)?',tag):
        raise SystemExit('Invalid release tag')
    if (tag[1:]+'.0' if len(tag[1:].split('.'))==3 else tag[1:])!=release_version:
        raise SystemExit('Release tag must match the plugin project version')
    output=ROOT/'artifacts'
    output.mkdir(exist_ok=True)
    archive=output/f'jellyfin-shorts-{release_version}.zip'
    assembly=ROOT/'plugin/Jellyfin.Plugin.Shorts/bin/Release/net10.0/Jellyfin.Plugin.Shorts.dll'
    if not assembly.is_file():
        raise SystemExit('Build the plugin in Release mode before packaging')
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED) as package:
        # Explicit allowlist: never ship credentials, logs, source paths, PDBs or build caches.
        for source,name in [(assembly,assembly.name),(ROOT/'LICENSE','LICENSE'),(ROOT/'docs/INSTALL.md','INSTALL.md')]:
            info=zipfile.ZipInfo(name,(2026,1,1,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o644<<16
            package.writestr(info,source.read_bytes())
    data=archive.read_bytes()
    checksum=hashlib.sha256(data).hexdigest()
    (output/(archive.name+'.sha256')).write_text(checksum+'  '+archive.name+'\n')
    entry=[{'guid':GUID,'name':'Shorts','overview':'A swipeable video preview feed for Jellyfin Web.',
            'description':'Discover random moments from your libraries. Requires Plugin Pages and File Transformation for Jellyfin 12.2.',
            'owner':'cosmobits','category':'General','versions':[{
              'version':release_version,'targetAbi':'12.2.0.0',
              'sourceUrl':f'https://github.com/{REPOSITORY}/releases/download/{tag}/{archive.name}',
              'checksum':hashlib.md5(data,usedforsecurity=False).hexdigest().upper(),
              'timestamp':datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
              'changelog':'Initial Jellyfin 12.2 preview release. Shared React UI with standalone mode.',
              'dependencies':['5b6550fa-a014-4f4c-8a2c-59a43680ac6d','5e87cc92-571a-4d8d-8d98-d2d4147f9f90']
            }]}]
    (output/'release-manifest.json').write_text(json.dumps(entry,indent=2)+'\n')
    print(f'Packaged {archive.name}; SHA256 {checksum}')

if __name__=='__main__':
    main()
