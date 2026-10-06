
$port = 6324
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()

Write-Host "Proxy server running on http://localhost:$port/" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS headers
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        # Handle preflight
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        try {
            # Read request body
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $bodyText = $reader.ReadToEnd()
            $reader.Close()

            if (-not $bodyText) {
                throw "Empty request body. Send JSON: { url, method?, headers?, body?, cookies? }"
            }

            $json = $bodyText | ConvertFrom-Json

            if (-not $json.url) {
                throw "Missing 'url' field in JSON body."
            }

            $targetUrl = $json.url
            $targetMethod = if ($json.method) { $json.method.ToUpper() } else { "GET" }

            Write-Host "[$targetMethod] $targetUrl" -ForegroundColor Cyan

            # Build the web request
            $webRequest = [System.Net.HttpWebRequest]::Create($targetUrl)
            $webRequest.Method = $targetMethod
            $webRequest.Timeout = 30000
            $webRequest.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

            # Set cookies if provided
            if ($json.cookies) {
                $webRequest.CookieContainer = New-Object System.Net.CookieContainer
                $uri = New-Object System.Uri($targetUrl)
                $cookiePairs = $json.cookies -split ";\s*"
                foreach ($pair in $cookiePairs) {
                    $pair = $pair.Trim()
                    if ($pair -and $pair.Contains("=")) {
                        $eqIdx = $pair.IndexOf("=")
                        $cName = $pair.Substring(0, $eqIdx).Trim()
                        $cVal = $pair.Substring($eqIdx + 1).Trim()
                        try {
                            $cookie = New-Object System.Net.Cookie($cName, $cVal, "/", $uri.Host)
                            $webRequest.CookieContainer.Add($cookie)
                        } catch {}
                    }
                }
            }

            # Set custom headers if provided
            if ($json.headers) {
                $json.headers.PSObject.Properties | ForEach-Object {
                    $hName = $_.Name
                    $hVal = $_.Value
                    switch ($hName.ToLower()) {
                        "content-type" { $webRequest.ContentType = $hVal }
                        "accept"       { $webRequest.Accept = $hVal }
                        "referer"      { $webRequest.Referer = $hVal }
                        "user-agent"   { $webRequest.UserAgent = $hVal }
                        "host"         { $webRequest.Host = $hVal }
                        default        { $webRequest.Headers.Add($hName, $hVal) }
                    }
                }
            }

            # Write body for POST/PUT
            if ($targetMethod -in @("POST", "PUT", "PATCH") -and $json.body) {
                if (-not $webRequest.ContentType) {
                    $webRequest.ContentType = "application/x-www-form-urlencoded"
                }
                $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json.body)
                $webRequest.ContentLength = $bodyBytes.Length
                $reqStream = $webRequest.GetRequestStream()
                $reqStream.Write($bodyBytes, 0, $bodyBytes.Length)
                $reqStream.Close()
            }

            # Get response
            try {
                $webResponse = $webRequest.GetResponse()
            } catch [System.Net.WebException] {
                $webResponse = $_.Exception.Response
                if (-not $webResponse) { throw }
            }

            $respStream = $webResponse.GetResponseStream()
            $respReader = New-Object System.IO.StreamReader($respStream, [System.Text.Encoding]::UTF8)
            $respBody = $respReader.ReadToEnd()
            $respReader.Close()
            $respStream.Close()

            # Collect response cookies
            $respCookies = ""
            if ($webResponse.Cookies -and $webResponse.Cookies.Count -gt 0) {
                $cookieList = @()
                foreach ($c in $webResponse.Cookies) {
                    $cookieList += "$($c.Name)=$($c.Value)"
                }
                $respCookies = $cookieList -join "; "
            }

            # Build result JSON
            $result = @{
                status  = [int]$webResponse.StatusCode
                body    = $respBody
                cookies = $respCookies
            } | ConvertTo-Json -Depth 10

            $webResponse.Close()

            $response.ContentType = "application/json; charset=utf-8"
            $response.StatusCode = 200
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($result)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)

        } catch {
            $errMsg = @{ error = "$_" } | ConvertTo-Json
            $response.ContentType = "application/json; charset=utf-8"
            $response.StatusCode = 500
            $errBuffer = [System.Text.Encoding]::UTF8.GetBytes($errMsg)
            $response.ContentLength64 = $errBuffer.Length
            $response.OutputStream.Write($errBuffer, 0, $errBuffer.Length)
            Write-Host "ERROR: $_" -ForegroundColor Red
        }

        $response.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "Server stopped." -ForegroundColor Yellow
}