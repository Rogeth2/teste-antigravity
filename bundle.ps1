$files = @(
    'js/utils.js',
    'js/InputHandler.js',
    'js/Background.js',
    'js/entities/Entity.js',
    'js/entities/Projectile.js',
    'js/entities/Drop.js',
    'js/entities/Enemy.js',
    'js/entities/Boss.js',
    'js/entities/Player.js',
    'js/Game.js',
    'js/main.js'
)

$jsContent = ""
foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw -Encoding UTF8
        # Remove imports/exports logic - naive regex
        $content = $content -replace "import .* from .*", ""
        $content = $content -replace "export default class", "class"
        $content = $content -replace "export function", "function"
        $content = $content -replace "export \{.*\}", ""
        $jsContent += "`n// --- $file ---`n" + $content
    }
    else {
        Write-Host "Warning: $file not found"
    }
}

$html = Get-Content "index.html" -Raw -Encoding UTF8
if (Test-Path "style.css") {
    $css = Get-Content "style.css" -Raw -Encoding UTF8
    $cssTag = '<link rel="stylesheet" href="style.css">'
    $cssIndex = $html.IndexOf($cssTag)
    if ($cssIndex -ge 0) {
        $html = $html.Substring(0, $cssIndex) + "<style>$css</style>" + $html.Substring($cssIndex + $cssTag.Length)
    }
}
$tag = '<script type="module" src="js/main.js"></script>'
$index = $html.IndexOf($tag)
if ($index -ge 0) {
    $html = $html.Substring(0, $index) + "<script>`n$jsContent`n</script>" + $html.Substring($index + $tag.Length)
}

Set-Content "game_bundled.html" $html -Encoding UTF8
Write-Host "Bundled to game_bundled.html"
