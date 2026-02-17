import os
import re

# Order of files is important for dependencies
files = [
    'js/utils.js',
    'js/InputHandler.js',
    'js/Background.js',
    'js/entities/Entity.js',
    'js/entities/Projectile.js',
    'js/entities/Drop.js',
    'js/entities/Enemy.js',
    'js/entities/Player.js',
    'js/Game.js',
    'js/main.js'
]

html_template = 'index.html'
output_file = 'game_bundled.html'

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def process_js(content):
    # Remove imports
    content = re.sub(r'import .* from .*;', '', content)
    # Remove export default
    content = re.sub(r'export default class', 'class', content)
    content = re.sub(r'export function', 'function', content)
    # Remove export { ... }
    content = re.sub(r'export \{.*\};', '', content)
    return content

print("Bundling game...")

js_bundle = ""
for js_file in files:
    if os.path.exists(js_file):
        print(f"Processing {js_file}...")
        content = read_file(js_file)
        js_bundle += f"\n// --- {js_file} ---\n"
        js_bundle += process_js(content)
        js_bundle += "\n"
    else:
        print(f"Warning: {js_file} not found!")

html_content = read_file(html_template)

# Inject CSS (if separate) or just leave it if it's external? 
# User wanted single file, so we should inline CSS too.
css_file = 'style.css'
css_content = ""
if os.path.exists(css_file):
    css_content = read_file(css_file)

# Inject into HTML
# Replace <link rel="stylesheet" href="style.css"> with <style>...</style>
html_content = html_content.replace('<link rel="stylesheet" href="style.css">', f'<style>{css_content}</style>')

# Replace <script type="module" src="js/main.js"></script> with <script>...</script>
html_content = html_content.replace('<script type="module" src="js/main.js"></script>', f'<script>{js_bundle}</script>')

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"Done! Created {output_file}")
