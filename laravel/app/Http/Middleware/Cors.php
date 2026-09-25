<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * CORS + preflight. Mirrors the Node cors() configuration:
 *   - allowed origin(s) from SHEGA_CORS_ALLOWED_ORIGINS (no wildcard)
 *   - methods GET/POST/PATCH/DELETE/OPTIONS + credentials true
 *   - Bearer Authorization header propagated via .htaccess [E=HTTP_AUTHORIZATION]
 */
class Cors
{
    public const HEADERS = [
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Credentials',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers',
        'Access-Control-Expose-Headers',
        'Access-Control-Max-Age',
        'Vary',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->headers->get('Origin');
        $allowed = config('shega.cors.allowed_origins', []);

        $allowOrigin = in_array($origin, $allowed, true) ? $origin : null;

        $response = $next($request);

        if ($allowOrigin !== null) {
            $response->headers->set('Access-Control-Allow-Origin', $allowOrigin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Expose-Headers', 'Content-Length, X-Total-Count, Link');
            $response->headers->set('Vary', 'Origin');
        }

        $response->headers->set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        $response->headers->set('Access-Control-Max-Age', '86400');

        return $response;
    }
}
