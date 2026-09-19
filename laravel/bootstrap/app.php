<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
        health: '/api/health',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'auth.jwt' => \App\Http\Middleware\AuthenticateJwt::class,
            'admin.only' => \App\Http\Middleware\RequireAdmin::class,
            'login.throttle' => \App\Http\Middleware\LoginLockout::class,
            'cors' => \App\Http\Middleware\Cors::class,
        ]);

        $middleware->api(prepend: [
            \App\Http\Middleware\Cors::class,
            \App\Http\Middleware\StripTrailingSlash::class,
        ]);

        $middleware->alias([], [])->throttleApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(function ($request) {
            return $request->is('api/*') || $request->is('api') || $request->is('health') || $request->is('api/health');
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e, $request) {
            return app(\App\Support\Errors::class)->render($request, $e);
        });
    })
    ->create();
