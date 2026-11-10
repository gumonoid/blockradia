"""Refresh the bundled official SDN address snapshot. Python standard library only."""
import datetime
import hashlib
import json
import pathlib
import urllib.request
import xml.etree.ElementTree as ET

URL = 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML'
def parse(data):
    if b'<!DOCTYPE' in data or b'<!ENTITY' in data:
        raise ValueError('XML entities are not accepted')
    root = ET.fromstring(data)
    for node in root.iter():
        node.tag = node.tag.split('}')[-1]
    if root.tag != 'sdnList':
        raise ValueError('Unexpected OFAC document')
    records = []
    for entry in root.findall('sdnEntry'):
        name = ' '.join(filter(None, [entry.findtext('firstName'), entry.findtext('lastName')]))
        for item in entry.findall('./idList/id'):
            kind = item.findtext('idType', '')
            if not kind.startswith('Digital Currency Address - '):
                continue
            address = item.findtext('idNumber', '').strip()
            if not address or not name or not entry.findtext('uid'):
                raise ValueError('Incomplete address record')
            records.append(dict(currency=kind.removeprefix('Digital Currency Address - ').strip(), address=address,
                entity=name, uid=entry.findtext('uid'), programs=[x.text for x in entry.findall('./programList/program')]))
    if not records:
        raise ValueError('No digital currency records; keeping previous snapshot')
    return dict(source=URL, retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        publishedAt=root.findtext('./publshInformation/Publish_Date'), sha256=hashlib.sha256(data).hexdigest(), records=records)

if __name__ == '__main__':
    with urllib.request.urlopen(URL, timeout=90) as response:
        data = response.read(60_000_001)
    if len(data)>60_000_000:
        raise ValueError('Source exceeds size limit')
    result=parse(data)
    target=pathlib.Path(__file__).resolve().parents[1]/'lib'/'ofac-snapshot.json'
    temporary=target.with_suffix('.tmp')
    temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temporary.replace(target)
    print(f"Imported {len(result['records'])} OFAC address records")
