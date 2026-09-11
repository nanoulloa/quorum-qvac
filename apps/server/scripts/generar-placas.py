"""Genera placas ficticias de equipos médicos para evaluar VisionPsy (issue P1-03).

Uso: npm run placas:generar -w @quorum/server
Salida: fixtures/placas/placa-XX.png y fixtures/placas/verdad.json. Semilla fija: siempre las mismas placas.
"""
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

random.seed(42)
SALIDA = Path(__file__).resolve().parent.parent / 'fixtures' / 'placas'
SALIDA.mkdir(parents=True, exist_ok=True)

EQUIPOS = [
    ('Philips', 'Ingenia 1.5T'), ('Philips', 'Achieva 3.0T'), ('Philips', 'Incisive CT'), ('Philips', 'EPIQ Elite'),
    ('Siemens', 'MAGNETOM Avanto'), ('Siemens', 'SOMATOM Force'), ('Siemens', 'ACUSON Juniper'),
    ('GE', 'SIGNA Explorer'), ('GE', 'Revolution EVO'), ('GE', 'LOGIQ E10'),
    ('Canon', 'Vantage Orian'), ('Canon', 'Aquilion ONE'), ('Canon', 'Aplio i800'),
]
MARCA_IMPRESA = {'Philips': 'PHILIPS', 'Siemens': 'SIEMENS', 'GE': 'GE Healthcare', 'Canon': 'CANON MEDICAL'}
FORMATOS_FECHA = ['Mfg. date {a}-{m:02d}', 'Manufactured: {m:02d}/{a}', 'Date of manufacture {a}.{m:02d}', 'MFD {a}-{m:02d}']
VARIACIONES = ['limpia', 'rotada', 'desenfocada', 'reflejo', 'bajo contraste']


def fuente(nombres, size):
    for n in nombres:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)


SANS = ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/Library/Fonts/Arial Bold.ttf', 'DejaVuSans-Bold.ttf']
MONO = ['/System/Library/Fonts/Supplemental/Courier New Bold.ttf', '/System/Library/Fonts/Supplemental/Courier New.ttf', 'DejaVuSansMono.ttf']


def serie():
    letras = random.choice(['', 'SN', 'MR', 'CT', 'US'])
    return f"{letras}{random.randint(10000, 99999999)}"


verdad = []
for i in range(30):
    marca, modelo = EQUIPOS[i % len(EQUIPOS)]
    variacion = VARIACIONES[i % len(VARIACIONES)]
    anio, mes = random.randint(2008, 2024), random.randint(1, 12)
    numero_serie = serie()
    fecha = random.choice(FORMATOS_FECHA).format(a=anio, m=mes)

    fondo, tinta = ((214, 217, 221), (40, 44, 49)) if variacion != 'bajo contraste' else ((170, 174, 178), (105, 110, 116))
    placa = Image.new('RGB', (640, 420), fondo)
    d = ImageDraw.Draw(placa)
    d.rectangle([0, 0, 639, 419], outline=(150, 156, 162), width=3)
    for x, y in [(22, 22), (618, 22), (22, 398), (618, 398)]:
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=(150, 156, 162))
    lineas = [
        (MARCA_IMPRESA[marca], fuente(SANS, 58), 44),
        (modelo, fuente(SANS, 38), 130),
        (f'SN {numero_serie}', fuente(MONO, 30), 206),
        (fecha, fuente(MONO, 28), 256),
        (random.choice(['230 V ~ 50/60 Hz', '400 V 3~ 50/60 Hz  7.5 kVA', '100-240 V  1.2 A']), fuente(MONO, 24), 318),
    ]
    for texto, f, y in lineas:
        d.text((56, y), texto, font=f, fill=tinta)

    angulo = random.uniform(-9, 9) if variacion == 'rotada' else random.uniform(-2, 2)
    foto = Image.new('RGB', (960, 640), (34, 38, 44))
    rotada = placa.rotate(angulo, expand=True, fillcolor=(34, 38, 44), resample=Image.BICUBIC)
    foto.paste(rotada, ((960 - rotada.width) // 2, (640 - rotada.height) // 2))

    if variacion == 'reflejo':
        brillo = Image.new('L', foto.size, 0)
        ImageDraw.Draw(brillo).ellipse([random.randint(250, 450), 180, random.randint(600, 760), 420], fill=170)
        foto = Image.composite(Image.new('RGB', foto.size, (255, 255, 255)), foto, brillo.filter(ImageFilter.GaussianBlur(45)))
    radio = 1.8 if variacion == 'desenfocada' else 0.6
    foto = foto.filter(ImageFilter.GaussianBlur(radio))

    archivo = f'placa-{i + 1:02d}.png'
    foto.save(SALIDA / archivo)
    verdad.append({'archivo': archivo, 'variacion': variacion, 'marca': marca, 'modelo': modelo, 'serie': numero_serie, 'anio': anio})

(SALIDA / 'verdad.json').write_text(json.dumps(verdad, ensure_ascii=False, indent=2) + '\n')
print(f'{len(verdad)} placas en {SALIDA}')
