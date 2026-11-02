#!/usr/bin/env python3
"""웹용 이미지 파생본(WebP) 생성 스크립트.

- 원본 사진(assets/ 아래 JPG)은 절대 수정하지 않습니다.
- 크기 축소와 WebP 재압축만 수행합니다. 크롭·합성·보정은 하지 않습니다.
  (예외: OG 공유 이미지 1장은 SNS 권장 비율 1200x630에 맞춰 가운데 기준으로 잘라냅니다.)
- 결과물은 assets/optimized/ 아래에 원본과 같은 폴더 구조로 저장됩니다.
- EXIF/GPS 등 메타데이터는 결과물에 포함하지 않습니다.

사용법:  pip install pillow  →  python3 scripts/optimize-images.py
새 사진을 홈페이지에 추가했다면 아래 IMAGES 목록에 경로를 추가하고 다시 실행하세요.
"""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "optimized"
WIDTHS = (640, 1200, 1600, 2400)
QUALITY = 78

# 홈페이지에서 실제로 사용하는 사진만 등록합니다.
IMAGES = [
    "assets/church-2026-10/hero-sermon-real-v4.jpg",
    "assets/church-2026-10/sermon.jpg",
    "assets/church-2026-10/hall.jpg",
    "assets/church-2026-10/choir.jpg",
    "assets/church-2026-10/prayer.jpg",
    "assets/church-2026-10/entrance.jpg",
    "assets/church-2026-10/fellowship.jpg",
    "assets/church-2026-10/building.jpg",
    "assets/church-2026-10/congregation.jpg",
    "assets/church-2026-10/support-prayer-soft-light.jpg",
    "assets/church-2026-10-28/pastor-guitar.jpg",
    "assets/church-2026-10-28/sermon.jpg",
    "assets/church-2026-10-28/congregation-prayer.jpg",
    "assets/church-2026-10-28/worship-scene.jpg",
    "assets/church-2026-10-28/joint-prayer.jpg",
    "assets/pastor-lee-boyong-2026.jpg",
    "assets/diakonia-choir.jpg",
    "assets/sermon-20261011.jpg",
    "assets/sermon-20260927.jpg",
    "assets/sermon-20260920.jpg",
    "assets/stock/cross-halo.jpg",
    "assets/stock/bible-open.jpg",
]

OG_SOURCE = "assets/church-2026-10/hero-sermon-real-v4.jpg"
OG_TARGET = "assets/og-image.jpg"


def out_path(src: Path, width: int) -> Path:
    rel = src.relative_to(ROOT / "assets").with_suffix("")
    return OUT / f"{rel}-{width}.webp"


def make_variants(rel: str) -> list[str]:
    src = ROOT / rel
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        w, h = im.size
        widths = sorted({x for x in WIDTHS if x < w} | {w})
        made = []
        for width in widths:
            target = out_path(src, width)
            target.parent.mkdir(parents=True, exist_ok=True)
            resized = im if width == w else im.resize((width, round(h * width / w)), Image.LANCZOS)
            resized.save(target, "WEBP", quality=QUALITY, method=6)
            made.append(f"{target.relative_to(ROOT)} ({resized.size[0]}x{resized.size[1]}, {target.stat().st_size // 1024}KB)")
        return made


def make_og_image() -> str:
    with Image.open(ROOT / OG_SOURCE) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        og = ImageOps.fit(im, (1200, 630), Image.LANCZOS, centering=(0.5, 0.5))
        target = ROOT / OG_TARGET
        og.save(target, "JPEG", quality=82, optimize=True, progressive=True)
        return f"{OG_TARGET} (1200x630, {target.stat().st_size // 1024}KB)"


if __name__ == "__main__":
    for rel in IMAGES:
        for line in make_variants(rel):
            print(line)
    print(make_og_image())
