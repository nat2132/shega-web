<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * accounts_user (Django accounts.User) — exact Prisma 0001_init shape.
     * Guarded with Schema::hasTable so existing shega_admin data is never touched.
     */
    public function up(): void
    {
        if (Schema::hasTable('accounts_user')) {
            return;
        }

        Schema::create('accounts_user', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->string('password', 128);
            $table->dateTime('last_login')->nullable();
            $table->boolean('is_superuser')->default(false);
            $table->string('username', 150);
            $table->string('first_name', 150)->default('');
            $table->string('last_name', 150)->default('');
            $table->string('email', 254)->default('');
            $table->boolean('is_staff')->default(false);
            $table->boolean('is_active')->default(true);
            $table->dateTime('date_joined');
            $table->string('phone', 20)->nullable();
            $table->string('business_name', 255)->default('');
            $table->string('business_type', 50)->default('');
            $table->longText('address');
            $table->boolean('is_customer')->default(false);
            $table->boolean('is_admin')->default(false);
            $table->boolean('email_verified')->default(false);
            $table->boolean('phone_verified')->default(false);
            $table->dateTime('created_at');
            $table->dateTime('updated_at');
            $table->longText('notes');

            $table->unique('username');
            $table->unique('phone');

            $table->primary('id');
        });
    }

    public function down(): void
    {
        // Non-destructive by policy: we never drop pre-existing Prisma tables.
    }
};
