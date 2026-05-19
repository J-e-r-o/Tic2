$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $scriptPath

function Load-DotEnv {
    param([string]$DotEnvPath)

    if (-not (Test-Path $DotEnvPath)) {
        throw "No se encontró el archivo .env en $DotEnvPath"
    }

    Get-Content $DotEnvPath | ForEach-Object {
        if ($_ -match '^(?!\s*#)\s*([^=]+?)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($name -and $value -ne $null) {
                Set-Item -Path Env:$name -Value $value
            }
        }
    }
}

Write-Host "Cargando variables de entorno desde .env..."
Load-DotEnv "$scriptPath\.env"

$region = $env:AWS_REGION
if (-not $region) { $region = $env:AWS_DEFAULT_REGION }
if (-not $region) { $region = "us-east-2" }

if (-not (Get-Command sam -ErrorAction SilentlyContinue)) {
    throw "AWS SAM CLI no encontrado. Instala AWS SAM CLI y vuelve a intentarlo."
}

Write-Host "Construyendo Lambda en región $region..."
Write-Host "Nota: Este proceso puede tardar 1-2 minutos la primera vez..."
$buildResult = sam build
if ($LASTEXITCODE -ne 0) {
    throw "sam build falló. Revisa los mensajes anteriores."
}

Write-Host "Desplegando stack 'tic2-backend-lambda' en región $region..."
$parameterOverrides = @(
    "S3BucketName=$($env:S3_BUCKET)",
    "DBHost=$($env:DB_HOST)",
    "DBPort=$($env:DB_PORT)",
    "DBUser=$($env:DB_USER)",
    "DBPassword=$($env:DB_PASSWORD)",
    "DBName=$($env:DB_NAME)",
    "StageName=Prod"
) -join " "

sam deploy --stack-name tic2-backend-lambda --region $region --capabilities CAPABILITY_IAM --parameter-overrides $parameterOverrides

Pop-Location
