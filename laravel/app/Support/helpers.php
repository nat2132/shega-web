<?php

declare(strict_types=1);

use App\Support\Errors;
use App\Support\JwtService;
use App\Support\PasswordVerifier;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

if (! function_exists('srvc')) {
    /** Resolve a bound singleton service. */
    function srvc(string $abstract): mixed
    {
        return app($abstract);
    }
}

if (! function_exists('jwt_issue')) {
    /** Issue an access token for a user id. */
    function jwt_issue(int $userId): string
    {
        return srvc(JwtService::class)->issueAccess($userId);
    }
}

if (! function_exists('verify_password')) {
    /** Verify a plaintext password against a hash (Django pbkdf2 / bcrypt). */
    function verify_password(string $plain, string $hash): bool
    {
        return srvc(PasswordVerifier::class)->verify($plain, $hash);
    }
}

if (! function_exists('api_error')) {
    /** Bubble a business error (renders DRF-shaped). */
    function api_error(string $detail, int $status = 400): never
    {
        throw Errors::http($status, $detail);
    }
}
