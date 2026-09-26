$sourceDir = "c:\Users\HP\Desktop\Triple S Production\Constrotrait\src"
$destDir = "c:\Users\HP\Desktop\Triple S Production\TripleS-ERP"

# 1. Copy page.tsx
Copy-Item -Path "$sourceDir\app\(dashboard)\eod\page.tsx" -Destination "$destDir\app\(erp)\eod\page.tsx" -Force

# 2. Copy components
$compDir = "$destDir\components\eod"
if (!(Test-Path $compDir)) { New-Item -ItemType Directory -Path $compDir | Out-Null }
Copy-Item -Path "$sourceDir\components\modules\eod\*" -Destination $compDir -Recurse -Force

# 3. Copy services to actions
Copy-Item -Path "$sourceDir\services\eod.service.ts" -Destination "$destDir\lib\actions\eod.ts" -Force

# 4. Replace colors in all files
$files = Get-ChildItem -Path "$destDir\app\(erp)\eod", "$destDir\components\eod" -Filter "*.tsx" -Recurse
$files += Get-ChildItem -Path "$destDir\lib\actions" -Filter "eod.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName
    
    # Imports rewrite
    $content = $content -replace '@/services/eod.service', '@/lib/actions/eod'
    $content = $content -replace '@/components/modules/eod', '@/components/eod'
    $content = $content -replace '@/components/modules/', '@/components/'
    $content = $content -replace '@/services/', '@/lib/actions/'
    
    # Theme replace
    $content = $content -replace 'bg-orange-\d+', 'bg-black dark:bg-white text-white dark:text-black'
    $content = $content -replace 'text-orange-\d+', 'text-black dark:text-white'
    $content = $content -replace 'border-orange-\d+', 'border-black dark:border-white'
    $content = $content -replace 'bg-slate-\d+', 'bg-white dark:bg-zinc-950'
    $content = $content -replace 'text-slate-\d+', 'text-zinc-900 dark:text-zinc-100'
    $content = $content -replace 'border-slate-\d+', 'border-zinc-200 dark:border-zinc-800'
    $content = $content -replace 'bg-emerald-\d+', 'bg-zinc-100 dark:bg-zinc-900'
    $content = $content -replace 'text-emerald-\d+', 'text-zinc-900 dark:text-zinc-100'
    $content = $content -replace 'bg-red-\d+', 'bg-zinc-100 dark:bg-zinc-900'
    $content = $content -replace 'text-red-\d+', 'text-zinc-900 dark:text-zinc-100'
    $content = $content -replace 'bg-blue-\d+', 'bg-zinc-100 dark:bg-zinc-900'
    $content = $content -replace 'text-blue-\d+', 'text-zinc-900 dark:text-zinc-100'

    Set-Content -Path $file.FullName -Value $content
}
