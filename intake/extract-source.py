"""Bounded offline extraction. Emits source assertions, never verified market facts."""
import argparse, hashlib, io, json, re, subprocess, tempfile, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

parser=argparse.ArgumentParser()
parser.add_argument('--name',required=True)
args=parser.parse_args()
data=__import__('sys').stdin.buffer.read(32*1024*1024+1)
if len(data)>32*1024*1024: raise ValueError('source_too_large')
digest=hashlib.sha256(data).hexdigest()
source_id='SRC-'+digest[:20]
units=[]
warnings=[]
text_budget=0
ext=Path(args.name).suffix.lower()
def add(kind,number,paragraphs,source_path=None):
    global text_budget
    clean=[p.strip() for p in paragraphs if p.strip()]
    text_budget+=sum(len(p) for p in clean)
    if text_budget>4*1024*1024:raise ValueError('extracted_text_too_large')
    units.append(dict(unit_kind=kind,unit_number=number,paragraphs=clean,source_path=source_path))
def xml(zip_file,name):
    info=zip_file.getinfo(name)
    if info.file_size>2*1024*1024:raise ValueError('xml_part_too_large')
    body=zip_file.read(name)
    if b'<!DOCTYPE' in body or b'<!ENTITY' in body:raise ValueError('unsupported_xml_declaration')
    return ET.fromstring(body)

try:
    if ext in ('.pptx','.docx'):
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            if len(z.infolist())>2000:raise ValueError('too_many_zip_entries')
            if ext=='.pptx':
                ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
                rels={el.attrib['Id']:el.attrib['Target'] for el in xml(z,'ppt/_rels/presentation.xml.rels')}
                order=xml(z,'ppt/presentation.xml').findall('.//p:sldId',ns)
                if len(order)>500:raise ValueError('too_many_slides')
                for i,el in enumerate(order,1):
                    target=rels[el.attrib['{'+ns['r']+'}id']]
                    name=target.lstrip('/') if target.startswith('/') else str(Path('ppt')/target)
                    if '..' in Path(name).parts or not re.fullmatch(r'ppt/slides/slide\d+\.xml',name):raise ValueError('unsupported_slide_target')
                    root=xml(z,name)
                    add('slide',i,[''.join(t.text or '' for t in p.findall('.//a:t',ns)) for p in root.findall('.//a:p',ns)],name)
                warnings.append('Text extraction only: images, embedded charts, notes and visual reading order require review.')
            else:
                ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                root=xml(z,'word/document.xml')
                add('document',1,[''.join(t.text or '' for t in p.findall('.//w:t',ns)) for p in root.findall('.//w:p',ns)],'word/document.xml')
                warnings.append('DOCX paragraph references; page numbers require layout rendering. Images and tracked revisions require review.')
    elif ext=='.pdf':
        with tempfile.TemporaryDirectory(prefix='explainer-extract-') as folder:
            src=Path(folder)/'source.pdf';src.write_bytes(data)
            result=subprocess.run(['pdftotext','-layout','-enc','UTF-8',str(src),'-'],capture_output=True,check=True,timeout=25)
            if len(result.stdout)>4*1024*1024:raise ValueError('extracted_text_too_large')
            pages=result.stdout.decode('utf-8').split('\f')
            if pages and not pages[-1].strip():pages.pop()
            for i,page in enumerate(pages,1):add('page',i,re.split(r'\n\s*\n',page))
        warnings.append('PDF text layer only; scanned pages and chart geometry require OCR or visual review.')
    elif ext in ('.txt','.md','.csv'):
        text=data.decode('utf-8-sig',errors='strict')
        if '\x00' in text:raise ValueError('binary_text_input')
        for i,line in enumerate(text.splitlines(),1):add('line',i,[line])
    else:
        print(json.dumps(dict(status='analysis_required',sources=[dict(source_id=source_id,sha256=digest,file_name=args.name)],units=[],claims=[],warnings=['Media or unsupported file requires a compatible reference/transcription adapter.'],release_eligible=False)))
        raise SystemExit(0)
    if not any(u['paragraphs'] for u in units):raise ValueError('no_readable_text')
    claims=[]
    for unit in units:
        for i,text in enumerate(unit['paragraphs'],1):
            cid=f"C-{digest[:12]}-{unit['unit_kind']}{unit['unit_number']}-p{i}"
            refs=[dict(source_id=source_id,sha256=digest,unit_kind=unit['unit_kind'],unit_number=unit['unit_number'],paragraph=i,source_path=unit['source_path'])]
            claims.append(dict(claim_id=cid,text=text,source_locations=refs,numbers=re.findall(r'(?<!\w)(?:AED|USD|EUR|\$|€)?\s*\d[\d,.]*(?:\s*[–-]\s*\d[\d,.]*)?\s*%?',text),uncertainty_cues=re.findall(r'\b(?:may|could|estimated?|projected|forecast|potential|approximately|roughly)\b',text,re.I),causal_cues=re.findall(r'\b(?:because|therefore|leads? to|means|as a result|due to)\b',text,re.I),status='source_assertion_unverified',review_required=True))
    output=dict(schema_version='source-extract.v1',status='extracted',sources=[dict(source_id=source_id,sha256=digest,file_name=args.name)],units=units,claims=claims,warnings=warnings+['Claims are paragraph candidates, not semantic verification. Thesis, definitions and causal interpretation require the intelligence step.'],release_eligible=False)
except (ValueError,KeyError,ET.ParseError,zipfile.BadZipFile,subprocess.SubprocessError,FileNotFoundError,UnicodeError) as e:
    output=dict(schema_version='source-extract.v1',status='failed',sources=[dict(source_id=source_id,sha256=digest,file_name=args.name)],units=[],claims=[],warnings=['Extraction failed: '+type(e).__name__],release_eligible=False)
print(json.dumps(output,ensure_ascii=False))
