<?php

return [
    'defaults' => [
        'guard' => 'jwt',
        'passwords' => 'accounts_user',
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],
        'jwt' => [
            'driver' => 'jwt',
            'provider' => 'users',
        ],
        'api' => [
            'driver' => 'jwt',
            'provider' => 'users',
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => \App\Models\User::class,
        ],
    ],

    'passwords' => [
        'accounts_user' => [
            'provider' => 'users',
            'table' => 'auth_passwordreset',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],
];
