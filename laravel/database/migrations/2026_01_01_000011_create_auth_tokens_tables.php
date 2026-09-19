<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('auth_refreshtoken') || Schema::hasTable('accounts_loginattempt')) {
            Schema::create('auth_refreshtoken', function (Blueprint $table): void {
                $table->integer('id', true);
                $table->integer('user_id');
                $table->string('jti', 36);
                $table->string('token_hash', 64);
                $table->dateTime('expires_at');
                $table->dateTime('revoked_at')->nullable();
                $table->string('replaced_by_jti', 36)->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->string('user_agent', 500)->default('');
                $table->dateTime('created_at');

                $table->unique('jti');
                $table->unique('token_hash');
                $table->index('user_id');
                $table->index('expires_at');
                $table->primary('id');
            });

            if (! Schema::hasTable('accounts_loginattempt')) {
                return;
            }
        }

        if (Schema::hasTable('auth_refreshtoken')) {
            return;
        }

        Schema::create('auth_refreshtoken', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->integer('user_id');
            $table->string('jti', 36);
            $table->string('token_hash', 64);
            $table->dateTime('expires_at');
            $table->dateTime('revoked_at')->nullable();
            $table->string('replaced_by_jti', 36)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->default('');
            $table->dateTime('created_at');

            $table->unique('jti');
            $table->unique('token_hash');
            $table->index('user_id');
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
