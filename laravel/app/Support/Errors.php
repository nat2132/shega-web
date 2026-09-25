<?php

declare(strict_types=1);

namespace App\Support;

/**
 * DRF-shaped error rendering compatible with the Node API error format
 * ({detail, field:[...], count/next/previous/results, status}).
 */
final class Errors
{
    public function render(\Illuminate\Http\Request $request, \Throwable $e): \Illuminate\Http\JsonResponse
    {
        $payload = $this->shape($e);

        return response()->json(
            $payload['body'],
            $payload['status'],
            $this->headers($e),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
    }

    public function shape(\Throwable $e): array
    {
        if ($e instanceof \Illuminate\Validation\ValidationException) {
            return [
                'status' => 400,
                'body' => $e->errors(),
            ];
        }

        if ($e instanceof \Illuminate\Auth\AuthenticationException) {
            return [
                'status' => 401,
                'body' => ['detail' => 'Authentication credentials were not provided.'],
            ];
        }

        if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
            return [
                'status' => 404,
                'body' => ['detail' => 'Not found.'],
            ];
        }

        if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException) {
            $status = $e->getStatusCode();

            return [
                'status' => $status,
                'body' => ['detail' => $e->getMessage() ?: $this->defaultDetail($status)],
            ];
        }

        if ($e instanceof \Illuminate\Auth\Access\AuthorizationException) {
            return [
                'status' => 403,
                'body' => ['detail' => 'You do not have permission to perform this action.'],
            ];
        }

        if ($e instanceof \Illuminate\Database\QueryException && $e->errorInfo[1] === 1062) {
            return [
                'status' => 400,
                'body' => ['detail' => 'A record with this value already exists.'],
            ];
        }

        if (config('app.debug')) {
            return [
                'status' => 500,
                'body' => [
                    'detail' => $e->getMessage(),
                    'exception' => get_class($e),
                    'trace' => $e->getTraceAsString() ?: null,
                ],
            ];
        }

        return [
            'status' => 500,
            'body' => ['detail' => $this->defaultDetail(500)],
        ];
    }

    private function defaultDetail(int $status): string
    {
        return match ($status) {
            400 => 'Bad Request.',
            401 => 'Authentication credentials were not provided.',
            403 => 'You do not have permission to perform this action.',
            404 => 'Not found.',
            405 => 'Method not allowed.',
            429 => 'Request was throttled.',
            default => 'Internal Server Error.',
        };
    }

    private function headers(\Throwable $e): array
    {
        if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
            return $e->getHeaders();
        }

        return [];
    }
}
