<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('accounts_businessmembership')) {
            return;
        }

        Schema::create('accounts_businessmembership', function (Blueprint $table): void {
            $table->integer('id', true);
            $table->integer('user_id');
            $table->integer('business_id');
            $table->string('status', 20)->default('active');
            $table->string('role', 20)->default('cashier');
            $table->longText('permissions')->default('{}');
            $table->boolean('is_active')->default(true);
            $table->integer('invited_by_id')->nullable();
            $table->dateTime('created_at');
            $table->dateTime('updated_at');

            $table->unique(['user_id', 'business_id']);
            $table->primary('id');
        });
    }

    public function down(): void
    {
    }
};
