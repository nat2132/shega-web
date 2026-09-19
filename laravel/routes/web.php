<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => 'Shega Admin API',
        'status' => 'ok',
    ]);
});
