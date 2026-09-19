<?php

use Illuminate\Support\Arr;

return [
    'name' => env('APP_NAME', 'Shega Admin API'),

    'env' => env('APP_ENV', 'production'),

    'debug' => (bool) env('APP_DEBUG', false),

    'url' => env('APP_URL', 'https://api.afran.et'),

    'timezone' => env('APP_TIMEZONE', 'Africa/Addis_Ababa'),

    'locale' => env('APP_LOCALE', 'en'),

    'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'),

    'faker_locale' => env('APP_FAKER_LOCALE', 'en_US'),

    'cipher' => 'AES-256-CBC',

    'key' => env('APP_KEY'),

    'previous_keys' => [
        ...array_filter(
            explode(',', env('APP_PREVIOUS_KEYS', ''))
        ),
    ],

    'maintenance' => [
        'driver' => 'file',
        'store' => env('MAINTENANCE_STORE', 'database'),
    ],

    'providers' => \Illuminate\Support\ServiceProvider::defaultProviders()
        ->merge([
            App\Providers\AppServiceProvider::class,
    ])
        ->toArray(),
];

