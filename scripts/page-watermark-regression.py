"""Run against Vite: python scripts/page-watermark-regression.py [URL]."""
import base64
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ARTIFACTS = Path(__file__).resolve().parents[1] / 'uploads' / 'watermark-check'
DRAG_SETTLE_MS = 300


def sample_files(page):
    urls = page.evaluate('''() => [[600,800],[800,600],[600,800]].map(([w,h]) => {
        const c=document.createElement('canvas'); c.width=w;c.height=h;
        const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,w,h);return c.toDataURL();
    })''')
    files = [{'name': f'page-{i + 1}.png', 'mimeType': 'image/png',
              'buffer': base64.b64decode(url.split(',')[1])} for i, url in enumerate(urls)]
    return urls, files


def check_navigation(page):
    expect(page.locator('.page-counter')).to_have_text('1 / 3')
    expect(page.get_by_title('上移', exact=True).first).to_be_disabled()
    page.get_by_role('button', name='切换到第 2 页', exact=True).click(position={'x': 40, 'y': 60})
    expect(page.locator('.page-counter')).to_have_text('2 / 3')
    expect(page.get_by_role('button', name='切换到第 2 页', exact=True)).to_have_attribute('aria-current', 'page')
    page.get_by_role('button', name='切换到第 1 页', exact=True).focus()
    page.keyboard.press('Enter')
    expect(page.locator('.page-counter')).to_have_text('1 / 3')
    active_id = page.locator('[data-page-id]').first.get_attribute('data-page-id')
    page.get_by_title('下移', exact=True).first.click()
    expect(page.locator('.page-counter')).to_have_text('2 / 3')
    expect(page.locator('[aria-current=page]')).to_have_count(1)
    first = page.get_by_role('button', name='切换到第 1 页', exact=True).bounding_box()
    second = page.get_by_role('button', name='切换到第 2 页', exact=True).bounding_box()
    start = (first['x'] + 30, first['y'] + first['height'] / 2)
    end = (second['x'] + 30, second['y'] + second['height'] / 2)
    page.mouse.move(*start)
    page.mouse.down()
    page.mouse.move(start[0] + 12, start[1], steps=3)
    page.mouse.move(*end, steps=20)
    page.mouse.up()
    expect(page.locator('.page-counter')).to_have_text('1 / 3')
    assert page.locator('[data-page-id]').first.get_attribute('data-page-id') == active_id
    page.wait_for_timeout(DRAG_SETTLE_MS)
    page.get_by_role('button', name='拖动第 2 页排序', exact=True).focus()
    page.keyboard.press('Space')
    page.keyboard.press('ArrowUp')
    page.keyboard.press('Space')
    expect(page.locator('.page-counter')).to_have_text('2 / 3')
    page.wait_for_timeout(DRAG_SETTLE_MS)
    page.get_by_title('删除页面', exact=True).first.click()
    expect(page.locator('.page-counter')).to_have_text('1 / 2')
    page.get_by_title('删除页面', exact=True).first.click()
    expect(page.locator('.page-counter')).to_have_text('1 / 1')


def verify_overlay(page, config, source_url):
    page.wait_for_function("document.querySelector('[data-watermark-overlay]')?.complete")
    return page.evaluate('''async args => {
        const checks=await import('/scripts/watermark-browser-checks.js');
        return checks.compareOverlayToComposition(args);
    }''', {'config': config, 'sourceUrl': source_url})


def angle_slider(page, layout='single'):
    name = '整行倾斜角度' if layout == 'array' else '倾斜角度'
    return page.get_by_role('slider', name=name, exact=True)


def check_watermark_ui(page, source_url):
    page.get_by_role('button', name='水印', exact=True).click()
    page.get_by_role('button', name='单行水印', exact=True).click()
    page.get_by_label('水印文字', exact=True).fill('单行测试 SINGLE')
    angle_slider(page, 'single').fill('0')
    page.get_by_role('slider', name='水平位置', exact=True).fill('25')
    page.get_by_role('slider', name='垂直位置', exact=True).fill('75')
    page.get_by_role('button', name='应用水印', exact=True).click()
    config = {'layout': 'single', 'text': '单行测试 SINGLE', 'angle': 0, 'positionX': 25, 'positionY': 75}
    single = verify_overlay(page, config, source_url)
    page.get_by_role('button', name='阵列水印', exact=True).click()
    expect(page.get_by_role('slider', name='阵列间距', exact=True)).to_have_count(1)
    expect(angle_slider(page, 'array')).to_have_count(1)
    array = verify_overlay(page, {**config, 'layout': 'array'}, source_url)
    assert array != single
    page.get_by_role('button', name='单行水印', exact=True).click()
    expect(page.get_by_role('slider', name='水平位置', exact=True)).to_have_value('25')
    expect(angle_slider(page, 'single')).to_have_count(1)
    assert verify_overlay(page, config, source_url) == single
    page.screenshot(path=str(ARTIFACTS / 'single-watermark.png'))
    page.get_by_role('button', name='移除水印', exact=True).click()
    expect(page.locator('[data-watermark-overlay]')).to_have_count(0)
    page.get_by_role('button', name='完成', exact=True).click()
    return config, single


def check_downloads(page, config, source_url, expected):
    page.evaluate('(args) => {window.exportProbe=args;}', {'config': config, 'sourceUrl': source_url})
    with page.expect_download() as event:
        page.evaluate('''async () => {
            const {exportImages}=await import('/src/utils/documentExport.js');
            const p=window.exportProbe;
            await exportImages({documents:[{id:'export-single',previewUrl:p.sourceUrl}],placedStamps:{},
                watermarkConfig:p.config,settings:{qualityPreset:'original'}});
        }''')
    event.value.save_as(str(ARTIFACTS / 'single.png'))
    assert (ARTIFACTS / 'single.png').read_bytes() == base64.b64decode(expected.split(',')[1])
    with page.expect_download() as event:
        page.evaluate('''async () => {
            const {exportPdf}=await import('/src/utils/documentExport.js');const p=window.exportProbe;
            await exportPdf({documents:[{id:'export-single',previewUrl:p.sourceUrl}],placedStamps:{},
                watermarkConfig:p.config,settings:{qualityPreset:'original',enableVerification:false}});
        }''')
    event.value.save_as(str(ARTIFACTS / 'single.pdf'))
    encoded = base64.b64encode((ARTIFACTS / 'single.pdf').read_bytes()).decode('ascii')
    assert page.evaluate('''async data => {
        const {default:pdfjs}=await import('/src/utils/pdfRuntime.js');
        const pdf=await pdfjs.getDocument({data:Uint8Array.from(atob(data),c=>c.charCodeAt(0))}).promise;
        const page=await pdf.getPage(1);const viewport=page.getViewport({scale:4/3});
        const c=document.createElement('canvas');c.width=viewport.width;c.height=viewport.height;
        await page.render({canvasContext:c.getContext('2d'),viewport}).promise;
        const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0;
        for(let i=0;i<p.length;i+=4)if(p[i]<250)ink++;
        return pdf.numPages===1 && ink>100;
    }''', encoded)


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='chrome', headless=True, args=['--no-proxy-server'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5183', wait_until='networkidle', timeout=120000)
        print('Application loaded', flush=True)
        urls, files = sample_files(page)
        page.locator('input[type=file]').first.set_input_files(files)
        check_navigation(page)
        print('Navigation and drag checks passed', flush=True)
        config, single = check_watermark_ui(page, urls[2])
        check_downloads(page, config, urls[2], single)
        result = page.evaluate('''async () => (await import('/scripts/watermark-browser-checks.js')).checkWatermarkCanvas()''')
        result.update(page.evaluate('''async () => (await import('/scripts/watermark-browser-checks.js')).checkScanWatermarks()'''))
        assert not errors, errors
        print(json.dumps({'navigationAndDrag': 'PASS', 'uiPreviewAndPNG': 'PASS', 'pdf': 'PASS', **result}))
        browser.close()


if __name__ == '__main__':
    main()
