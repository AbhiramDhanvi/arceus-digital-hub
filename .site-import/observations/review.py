import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
D=Path('/tmp/browser/arceus'); rows=[]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for name,url in [('source','https://arceus-qr7q.onrender.com/'),('preview','http://localhost:8080')]:
   page=await b.new_page(viewport={'width':1280,'height':1800})
   await page.goto(url,wait_until='domcontentloaded'); await page.get_by_role('heading',name='Your voice. Your benefits.').wait_for(timeout=60000)
   await page.screenshot(path=str(D/f'{name}-desktop.png'))
   print(name, 'links',await page.locator('a').evaluate_all('(els)=>els.map(e=>({text:e.textContent,href:e.getAttribute("href")}))'))
   for text in ['Talk to ARCEUS','Explore schemes','My workspace']:
    await page.goto(url,wait_until='domcontentloaded')
    loc=page.get_by_role('button',name=text,exact=True).first if text!='My workspace' else page.get_by_role('link',name=text,exact=True)
    await loc.click(); await page.screenshot(path=str(D/f'{name}-{text.replace(" ","-")}.png'))
    body=await page.locator('body').inner_text(); (D/f'{name}-{text.replace(" ","-")}.html').write_text(await page.content())
    print(name,text,page.url,body[:3500]); rows.append({'site':name,'viewport':'desktop','trigger':text,'url':page.url,'observed':body[:500],'screenshot':str(D/f'{name}-{text.replace(" ","-")}.png')})
   await page.goto(url,wait_until='domcontentloaded'); await page.mouse.wheel(0,3500); await page.screenshot(path=str(D/f'{name}-bottom.png')); print(name,'bottom',await page.evaluate('({y:scrollY,h:document.documentElement.scrollHeight})'))
   await page.set_viewport_size({'width':390,'height':844}); await page.goto(url,wait_until='domcontentloaded'); await page.screenshot(path=str(D/f'{name}-phone.png'))
   await page.get_by_role('button',name='Menu',exact=True).click(); await page.screenshot(path=str(D/f'{name}-menu.png')); print(name,'menu',await page.locator('header').inner_text()); (D/f'{name}-menu.html').write_text(await page.content())
   await page.close()
  await b.close()
 (D/'ledger.json').write_text(json.dumps(rows,indent=2))
asyncio.run(main())
