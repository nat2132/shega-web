<?php

/* Single configuration entry point mirroring the Node api/src/config/env.ts values,
   all supplied via .env. Kept framework-free (plain reads) so it works in any context. */

return [

    'jwt' => [
        'secret' => env('JWT_SECRET', ''),
        'issuer' => env('JWT_ISSUER', 'shega-admin-api'),
        'audience' => env('JWT_AUDIENCE', 'shega-cloud'),
        'access_ttl' => (int) env('JWT_ACCESS_TTL', 3600),        // 1 hour
        'refresh_ttl' => (int) env('JWT_REFRESH_TTL', 2592000),   // 30 days
        'issuetm_leeway' => (int) env('JWT_LEEWAY', 30),
        'algorithm' => 'HS256',
    ],

    'security' => [
        'max_login_attempts' => (int) env('MAX_LOGIN_ATTEMPTS', 5),
        'login_lockout_minutes' => (int) env('LOGIN_LOCKOUT_MINUTES', 15),
        'password_min_length' => (int) env('PASSWORD_MIN_LENGTH', 8),
        'require_login_confirm' => (bool) env('REQUIRE_LOGIN_CONFIRM', false),
        'bcrypt_legacy_cost' => (int) env('BCRYPT_LEGACY_COST', 12),
        'bcrypt_legacy_salt' => env('BCRYPT_LEGACY_SALT', ''),
        'allow_http' => (bool) env('ALLOW_HTTP', false),
    ],

    'trial' => [
        'default_days' => (int) env('TRIAL_DEFAULT_DAYS', 14),
        'max_businesses_per_trial' => (int) env('TRIAL_MAX_BUSINESSES', 3),
        'max_days' => (int) env('TRIAL_MAX_DAYS', 30),
    ],

    'license' => [
        'max_devices_per_license' => (int) env('MAX_DEVICES_PER_LICENSE', 3),
        'default_device_limit' => (int) env('DEFAULT_DEVICE_LIMIT', 1),
        'key_prefix' => env('LICENSE_KEY_PREFIX', 'SG-'),
        'key_length' => (int) env('LICENSE_KEY_LENGTH', 20),
    ],

    'cors' => [
        'allowed_origins' => array_values(array_filter(array_map(
            'trim',
            explode(',', env('CORS_ALLOWED_ORIGINS', 'https://app.afran.et'))
        ))),
        'allowed_methods' => ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        'exposed_headers' => ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
        'max_age' => 86400,
        'supports_credentials' => (bool) env('CORS_CREDENTIALS', true),
    ],

    'rate_limit' => [
        'global' => (int) env('RATE_LIMIT_GLOBAL', 600),       // per minute
        'login' => (int) env('RATE_LIMIT_LOGIN', 20),
        'password_reset' => (int) env('RATE_LIMIT_PASSWORD_RESET', 10),
    ],

    'paginate' => [
        'default_page_size' => (int) env('DEFAULT_PAGE_SIZE', 25),
        'max_page_size' => (int) env('MAX_PAGE_SIZE', 100),
    ],

    'mode' => env('SERVICE_MODE', 'baseline'),
    'service' => 'shega-admin-api',
];
